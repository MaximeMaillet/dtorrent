require('dotenv').config();
const debug = require('debug');
const lDebug = debug('dTorrent:worker:list:debug');
const lError = debug('dTorrent:worker:list:error');

const clientTorrent = require('../clients/client');

/**
 * Resolve list of hash
 * @returns {Promise}
 * @param torrentHandler
 * @param config
 */
module.exports.start = async(torrentHandler, config) => {
	lDebug(`${config.name} : Start worker list`);
	await clientTorrent.init(config.pid, config);
	await list(torrentHandler, config);

	setInterval(async() => {
		await list(torrentHandler, config);
	}, config.interval_check);
};

/**
 * List all torrents
 * @return {Promise.<void>}
 */
async function list(torrentHandler, config) {
	try {
		const list = await clientTorrent.list(config.pid);
		for(const i in list) {
			torrentHandler.handle(list[i], config.pid);
		}
		torrentHandler.checkState(list, config.pid);
	} catch (error) {
		lError(`Exception ${error}`);
	}
}