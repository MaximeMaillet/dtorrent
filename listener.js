require('dotenv').config();

const debug = require('debug');
const TorrentList = require('./src/models/torrent-list');

const workerList = require('./src/workers/list');

const lDebug = debug('dTorrent:listener:debug');
const lError = debug('dTorrent:listener:error');
const staticTorrentList = new TorrentList();

/**
 * @param config
 */
module.exports.addConfig = (config) => {
	if(config.rtorrent_host) {
		process.env.RTORRENT_HOST = config.rtorrent_host;
	}

	if(config.rtorrent_port) {
		process.env.RTORRENT_PORT = config.rtorrent_host;
	}

	if(config.rtorrent_path) {
		process.env.RTORRENT_PATH = config.rtorrent_path;
	}
};

/**
 * @param listener
 * @return {Promise.<void>}
 */
module.exports.start = async(listener) => {
	try {
		lDebug('Launch listener');
		// TODO check all method for listener
		staticTorrentList.addListener(listener);
		launchListWorker();
	} catch(error) {
		lError(error);
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