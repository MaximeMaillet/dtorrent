require('dotenv').config();

const debug = require('debug');
const workerList = require('./workers/list');

const lError = debug('dTorrent:listener:error');

/**
 * @return {Promise.<void>}
 * @param staticList
 */
module.exports.start = async(staticList) => {
	try {
		launchListWorker(staticList);
	} catch(error) {
		lError(`Exception : ${error}`);
	}
};

/**
 * @return {Promise.<void>}
 */
async function launchListWorker(staticList) {
	workerList.start(staticList);
	setInterval(() => {
		workerList.start(staticList);
	}, 1500);
}

