const clone = require('clone');
const pify = require('pify');
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware');
const blockTagParamIndex = require('./cache-utils').blockTagParamIndex;
// `<nil>` comes from https://github.com/irchain/go-irchain/issues/16925
const emptyValues = [undefined, null, '\u003cnil\u003e'];

module.exports = createBlockReEmitMiddleware;

function createBlockReEmitMiddleware(opts = {}) {
  const {blockTracker, provider} = opts;
  if (!blockTracker) throw Error('BlockReEmitMiddleware - mandatory "blockTracker" option is missing.');
  if (!provider) throw Error('BlockReEmitMiddleware - mandatory "provider" option is missing.');

  return createAsyncMiddleware(async (req, res, next) => {
    const blockRefIndex = blockTagParamIndex(req);
    // skip if method does not include blockRef
    if (blockRefIndex === undefined) return next();
    // skip if not "latest"
    let blockRef = req.params[blockRefIndex];
    // omitted blockRef implies "latest"
    if (blockRef === undefined) blockRef = 'latest';
    if (blockRef !== 'latest') return next();
    // re-emit request with specific block-ref
    const childRequest = clone(req);
    const latestBlockNumber = await blockTracker.getLatestBlock();
    childRequest.params[blockRefIndex] = latestBlockNumber;
    const childRes = await retry(10, async () => {
      const childRes = await pify(provider.sendAsync).call(provider, childRequest);
      // verify result
      if (emptyValues.includes(childRes.result)) {
        throw new Error('BlockReEmitMiddleware - empty response');
      }
      return childRes;
    });
    // copy child response onto original response
    res.result = childRes.result;
    res.error = childRes.error;
  });

}

async function retry(maxRetries, asyncFn) {
  for (let index = 0; index < maxRetries; index++) {
    try {
      return await asyncFn();
    } catch (err) {
      await timeout(1000);
    }
  }
  throw new Error('BlockReEmitMiddleware - retries exhausted');
}

function timeout(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}
