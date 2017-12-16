require('dotenv').config();

const debug = require('debug');
const TorrentList = require('./src/models/torrent-list');
const workerList = require('./src/workers/list');
const mongoose = require('mongoose');
const api = require('./api');

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
		api(listener);

		lDebug('Launch listener');

		await initializeMongodb();

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

/**
 * Init mongo connection
 * @return {Promise}
 */
async function initializeMongodb() {
	return new Promise((resolve, reject) => {
		mongoose.connect(
			`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/torrent`,
			{
				useMongoClient: true
			},
			(err) => {
				if(err) {
					reject(err);
				} else {
					mongoose.Promise = require('bluebird');
					resolve(true);
				}
			}
		);
	});

}