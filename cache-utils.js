const stringify = require('json-stable-stringify');

module.exports = {
  cacheIdentifierForPayload: cacheIdentifierForPayload,
  canCache: canCache,
  blockTagForPayload: blockTagForPayload,
  paramsWithoutBlockTag: paramsWithoutBlockTag,
  blockTagParamIndex: blockTagParamIndex,
  cacheTypeForPayload: cacheTypeForPayload,
};

function cacheIdentifierForPayload(payload, skipBlockRef) {
  const simpleParams = skipBlockRef ? paramsWithoutBlockTag(payload) : payload.params;
  if (canCache(payload)) {
    return payload.method + ':' + stringify(simpleParams);
  } else {
    return null;
  }
}

function canCache(payload) {
  return cacheTypeForPayload(payload) !== 'never';
}

function blockTagForPayload(payload) {
  let index = blockTagParamIndex(payload);

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return null;
  }

  return payload.params[index];
}

function paramsWithoutBlockTag(payload) {
  const index = blockTagParamIndex(payload);

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return payload.params;
  }

  // irc_getBlockByNumber has the block tag first, then the optional includeTx? param
  if (payload.method === 'irc_getBlockByNumber') {
    return payload.params.slice(1);
  }

  return payload.params.slice(0, index);
}

function blockTagParamIndex(payload) {
  switch (payload.method) {
      // blockTag is at index 2
    case 'irc_getStorageAt':
      return 2;
      // blockTag is at index 1
    case 'irc_getBalance':
    case 'irc_getCode':
    case 'irc_getTransactionCount':
    case 'irc_call':
      return 1;
      // blockTag is at index 0
    case 'irc_estimateGas':
    case 'irc_getBlockByNumber':
      return 0;
      // there is no blockTag
    default:
      return undefined;
  }
}

function cacheTypeForPayload(payload) {
  switch (payload.method) {
      // cache permanently
    case 'webu_clientVersion':
    case 'webu_sha3':
    case 'irc_protocolVersion':
    case 'irc_getBlockTransactionCountByHash':
    case 'irc_getUncleCountByBlockHash':
    case 'irc_getCode':
    case 'irc_getBlockByHash':
    case 'irc_getTransactionByHash':
    case 'irc_getTransactionByBlockHashAndIndex':
    case 'irc_getTransactionReceipt':
    case 'irc_getUncleByBlockHashAndIndex':
    case 'irc_getCompilers':
    case 'irc_compileLLL':
    case 'irc_compileSolidity':
    case 'irc_compileSerpent':
    case 'shh_version':
    case 'test_permaCache':
      return 'perma';

      // cache until fork
    case 'irc_getBlockByNumber':
    case 'irc_getBlockTransactionCountByNumber':
    case 'irc_getUncleCountByBlockNumber':
    case 'irc_getTransactionByBlockNumberAndIndex':
    case 'irc_getUncleByBlockNumberAndIndex':
    case 'test_forkCache':
      return 'fork';

      // cache for block
    case 'irc_gasPrice':
    case 'irc_blockNumber':
    case 'irc_getBalance':
    case 'irc_getStorageAt':
    case 'irc_getTransactionCount':
    case 'irc_call':
    case 'irc_estimateGas':
    case 'irc_getFilterLogs':
    case 'irc_getLogs':
    case 'test_blockCache':
      return 'block';

      // never cache
    case 'net_version':
    case 'net_peerCount':
    case 'net_listening':
    case 'irc_syncing':
    case 'irc_sign':
    case 'irc_coinbase':
    case 'irc_mining':
    case 'irc_hashrate':
    case 'irc_accounts':
    case 'irc_sendTransaction':
    case 'irc_sendRawTransaction':
    case 'irc_newFilter':
    case 'irc_newBlockFilter':
    case 'irc_newPendingTransactionFilter':
    case 'irc_uninstallFilter':
    case 'irc_getFilterChanges':
    case 'irc_getWork':
    case 'irc_submitWork':
    case 'irc_submitHashrate':
    case 'db_putString':
    case 'db_getString':
    case 'db_putHex':
    case 'db_getHex':
    case 'shh_post':
    case 'shh_newIdentity':
    case 'shh_hasIdentity':
    case 'shh_newGroup':
    case 'shh_addToGroup':
    case 'shh_newFilter':
    case 'shh_uninstallFilter':
    case 'shh_getFilterChanges':
    case 'shh_getMessages':
    case 'test_neverCache':
      return 'never';
  }
}
