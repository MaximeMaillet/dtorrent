require('dotenv').config();

const debug = require('debug');
const TorrentList = require('./models/torrent-list');
const workerList = require('./workers/list');

const lError = debug('dTorrent:listener:error');
const staticTorrentList = new TorrentList();

/**
 * @param listener
 * @return {Promise.<void>}
 */
module.exports.start = async(listener) => {
	try {
		// TODO check all method for listener
		staticTorrentList.addListener(listener);

		launchListWorker();
	} catch(error) {
		lError(`Exception : ${error}`);
	}
};

/**
 * @return {Promise.<void>}
 */
async function launchListWorker() {
	workerList.start(staticTorrentList);
	setInterval(() => {
		workerList.start(staticTorrentList);
	}, 1500);
}

