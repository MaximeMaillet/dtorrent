require('dotenv').config();

const debug = require('debug');
const TorrentList = require('./src/models/torrent-list');
const workerList = require('./src/workers/list');
const mongoose = require('mongoose');

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
		process.env.RTORRENT_PORT = config.rtorrent_port;
	}

	if(config.rtorrent_path) {
		process.env.RTORRENT_PATH = config.rtorrent_path;
	}

	if(config.mongo_host) {
		process.env.MONGO_HOST = config.mongo_host;
	}

	if(config.mongo_port) {
		process.env.MONGO_PORT = config.mongo_port;
	}
};

/**
 * @param listener
 * @return {Promise.<void>}
 */
module.exports.start = async(listener) => {
	try {
		lDebug('Launch listener');

		await initializeMongodb();
		mongoose.Promise = require('bluebird');

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

async function initializeMongodb() {
	return mongoose.connect(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/torrent`, {
		useMongoClient: true
	})
	.then(() => {
		return true;
	});
}