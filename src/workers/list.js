require('dotenv').config();
'use strict';

const debug = require('debug');

const clientTorrent = require('../clients/rTorrent');
const Torrent = require('../models/torrent');

const lDebug = debug('dTorrent:worker:list:debug');
const lError = debug('dTorrent:worker:list:error');

/**
 * Resolve list of hash
 * @returns {Promise}
 * @param listenerHandler
 * @param torrentHandler
 */
module.exports.start = async({listenerHandler, torrentHandler}) => {
	lDebug('Start worker list ');
	torrentHandler.addListenerHandler(listenerHandler);
	list({listenerHandler, torrentHandler});

	setInterval(() => {
		list({listenerHandler, torrentHandler});
	}, process.env.INTERVAL_CHECK);
};

/**
 * List all torrents
 * @return {Promise.<void>}
 */
async function list({listenerHandler, torrentHandler}) {
	try {
		const list = await clientTorrent.list();
		for(const i in list) {
			const trnt = new Torrent(list[i]);
			if(torrentHandler.isExist(trnt)) {
				torrentHandler.update(trnt);
			}
			else {
				await torrentHandler.add(trnt);
			}
		}
	} catch (error) {
		console.log(error);
		lError(`Exception ${error}`);
	}
}