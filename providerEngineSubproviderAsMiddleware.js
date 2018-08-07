const EventEmitter = require('events');
const IrcQuery = require('irc-query');
const ircUtil = require('icjs-util');

// this is a really minimal shim
// not really tested, i hope it works
// sorry

module.exports = providerEngineSubproviderAsMiddle;

function providerEngineSubproviderAsMiddle({subprovider, provider, blockTracker}) {
  const ircQuery = new IrcQuery(provider);
  // create a provider-engine interface
  const engine = new EventEmitter();
  // note: ircQuery fills in omitted params like id
  engine.sendAsync = ircQuery.sendAsync.bind(ircQuery);
  // forward events
  blockTracker.on('sync', engine.emit.bind(engine, 'sync'));
  blockTracker.on('latest', engine.emit.bind(engine, 'latest'));
  blockTracker.on('block', engine.emit.bind(engine, 'rawBlock'));
  blockTracker.on('block', (block) => engine.emit('block', toBufferBlock(block)));
  // set engine
  subprovider.setEngine(engine);

  // create middleware
  return (req, res, next, end) => {
    // send request to subprovider
    subprovider.handleRequest(req, subproviderNext, subproviderEnd);

    // adapter for next handler
    function subproviderNext(nextHandler) {
      if (!nextHandler) return next();
      next((done) => {
        nextHandler(res.error, res.result, done);
      });
    }

    // adapter for end handler
    function subproviderEnd(err, result) {
      if (err) return end(err);
      if (result)
        res.result = result;
      end();
    }
  };
}

function toBufferBlock(jsonBlock) {
  return {
    number: ircUtil.toBuffer(jsonBlock.number),
    hash: ircUtil.toBuffer(jsonBlock.hash),
    parentHash: ircUtil.toBuffer(jsonBlock.parentHash),
    nonce: ircUtil.toBuffer(jsonBlock.nonce),
    sha3Uncles: ircUtil.toBuffer(jsonBlock.sha3Uncles),
    logsBloom: ircUtil.toBuffer(jsonBlock.logsBloom),
    transactionsRoot: ircUtil.toBuffer(jsonBlock.transactionsRoot),
    stateRoot: ircUtil.toBuffer(jsonBlock.stateRoot),
    receiptsRoot: ircUtil.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner: ircUtil.toBuffer(jsonBlock.miner),
    difficulty: ircUtil.toBuffer(jsonBlock.difficulty),
    totalDifficulty: ircUtil.toBuffer(jsonBlock.totalDifficulty),
    size: ircUtil.toBuffer(jsonBlock.size),
    extraData: ircUtil.toBuffer(jsonBlock.extraData),
    gasLimit: ircUtil.toBuffer(jsonBlock.gasLimit),
    gasUsed: ircUtil.toBuffer(jsonBlock.gasUsed),
    timestamp: ircUtil.toBuffer(jsonBlock.timestamp),
    transactions: jsonBlock.transactions,
  };
}