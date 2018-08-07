const IrcQuery = require('irc-query');
const createVm = require('icjs-vm/lib/hooked').fromWeb3Provider;
const blockFromRpc = require('icjs-block/from-rpc');
const FakeTransaction = require('icjs-tx/fake');
const scaffold = require('./scaffold');

module.exports = createVmMiddleware;

function createVmMiddleware({provider}) {
  const ircQuery = new IrcQuery(provider);

  return scaffold({
    irc_call: (req, res, next, end) => {
      const blockRef = req.params[1];
      ircQuery.getBlockByNumber(blockRef, false, (err, blockParams) => {
        if (err) return end(err);
        // create block
        const block = blockFromRpc(blockParams);
        runVm(req, block, (err, results) => {
          if (err) return end(err);
          const returnValue = results.vm.return ? '0x' + results.vm.return.toString('hex') : '0x';
          res.result = returnValue;
          end();
        });
      });
    },
  });

  function runVm(req, block, cb) {
    const txParams = Object.assign({}, req.params[0]);
    const blockRef = req.params[1];
    // opting to use blockRef as specified
    // instead of hardening to resolved block's number
    // for compatiblity with irc-json-rpc-ipfs
    // const blockRef = block.number.toNumber()

    // create vm with state lookup intercepted
    const vm = createVm(provider, blockRef, {
      enableHomestead: true,
    });

    // create tx
    txParams.from = txParams.from || '0x0000000000000000000000000000000000000000';
    txParams.gasLimit = txParams.gasLimit || ('0x' + block.header.gasLimit.toString('hex'));
    const tx = new FakeTransaction(txParams);

    vm.runTx({
      tx: tx,
      block: block,
      skipNonce: true,
      skipBalance: true,
    }, function(err, results) {
      if (err) return cb(err);
      if (results.error) {
        return cb(new Error('VM error: ' + results.error));
      }
      if (results.vm && results.vm.exception !== 1 && results.vm.exceptionError !== 'invalid opcode') {
        return cb(new Error('VM Exception while executing ' + req.method + ': ' + results.vm.exceptionError));
      }

      cb(null, results);
    });
  }
}
