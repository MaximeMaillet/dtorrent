require('dotenv').config();

const debug = require('debug');
const mongoose = require('mongoose');

const TorrentList = require('./src/models/torrent-list');
const launchListener = require('./src/listener/listener');

const lDebug = debug('dTorrent:app:debug');
const lError = debug('dTorrent:app:error');

const staticTorrentList = new TorrentList();

/**
 * Add config
 * @param config
 */
module.exports.addConfig = (config) => {
	const configs = [
		'rtorrent_host', 'rtorrent_port', 'rtorrent_path',
		'mongo_host', 'mongo_port',
		'app_port', 'api_websocket'
	];

	for(const i in configs) {
		if(configs[i]) {
			process.env[configs[i].toUpperCase()] = config[configs[i]];
		}
	}
};

/**
 * Start app
 * @return {Promise.<void>}
 */
module.exports.start = async(enableListener, callback) => {

	try {
		lDebug('Check connections');
		await checkConnection();

		const manager = require('./src/manager')(staticTorrentList);

		if(callback) {
			staticTorrentList.addListener(callback);
		}

		if(enableListener) {
			lDebug('Launch listener');
			launchListener.start(staticTorrentList);
		}

		return manager;
	} catch(e) {
		lError(`Exception app ${e}`);
	}
};

/**
 * Check connection with external tools
 * @return {Promise.<void>}
 */
async function checkConnection() {
	try {
		await initializeMongodb();
		lDebug('Connections MongoDB OK');
	} catch(e) {
		lError(`Exception connections ${e}`);
	}
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