const debug = require('debug');
const clientTorrent = require('../clients/rTorrent');

const lDebug = debug('dTorrent:worker:list:debug');
const lError = debug('dTorrent:worker:list:error');

/**
 * Resolve list of hash
 * @returns {Promise}
 * @param staticTorrentList
 */
module.exports.start = async(staticTorrentList) => {
	lDebug('Worker-list start');

	const list = await clientTorrent.list();
	for(let i=0; i<list.length; i++) {
		try {
			staticTorrentList.check(list[i]);
		}
		catch (error) {
			lError(`Exception ${error}`);
		}
	}
};