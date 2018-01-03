require('dotenv').config();

const debug = require('debug');
const workerList = require('./workers/list');

const lError = debug('dTorrent:listener:error');

/**
 * @return {Promise.<void>}
 * @param staticList
 */
module.exports.start = async(staticList) => {

};

