const debug = require('debug');
const clientTorrent = require('../clients/rTorrent');

const lDebug = debug('dTorrent:listener:worker:debug');
const lError = debug('dTorrent:listener:worker:error');

/**
 * Resolve list of hash
 * @returns {Promise}
 * @param staticTorrentList
 */
module.exports.start = async(staticTorrentList) => {
	lDebug('Worker-list start');

	const list = await clientTorrent.list();
	for(const i in list) {
		try {
			staticTorrentList.update(list[i]);
		}
		catch (error) {
			lError(`Exception ${error}`);
		}
	}
};