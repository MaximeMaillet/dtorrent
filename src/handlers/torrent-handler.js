'use strict';
const debug = require('debug');
const lDebug = debug('dTorrent:handler:torrent:debug');
const lError = debug('dTorrent:handler:torrent:list:error');

const clientTorrent = require('../clients/client');
const Torrent = require('../models/torrent');

const torrents = [];
let listenerHandler = null;

module.exports.addListenerHandler = (_listenerHandler) => {
	listenerHandler = _listenerHandler;
};

/**
 * @param torrent
 * @return {Promise.<void>}
 */
module.exports.add = async(torrent) => {
	lDebug(`Torrent added ${torrent.hash}`);
	torrent.merge((await clientTorrent.getTorrent(torrent.hash)));
	torrents.push(torrent);
	listenerHandler.on(listenerHandler.EVENT.ADDED, torrent);
};

/**
 * @param _torrent
 * @return {Promise.<void>}
 */
module.exports.update = async(_torrent) => {
	_torrent.merge((await clientTorrent.getTorrent(_torrent.hash)));
	const torrent = module.exports.getTorrent(_torrent);
	const diff = torrent.getDiff(_torrent);

	if(diff.length > 0) {
		lDebug(`Torrent updated : ${_torrent.hash} : ${diff.join(',')}`);
		torrent.update(_torrent, diff);
		listenerHandler.on(listenerHandler.EVENT.UPDATED, torrent, diff);

		if(diff.indexOf('downloaded') !== -1 && torrent.finished) {
			listenerHandler.on(listenerHandler.EVENT.FINISHED, torrent);
		}
	}
};

/**
 * @param _torrent
 * @return {boolean}
 */
module.exports.isExist = (_torrent) => {
	const torrent = module.exports.getTorrent(_torrent);
	return torrent !== null;
};

/**
 * @param torrent
 * @return {*}
 */
module.exports.getTorrent = (torrent) => {
	for(const i in torrents) {
		if(torrents[i].hash === torrent.hash) {
			return torrents[i];
		}
	}
	return null;
};

/**
 * @return {Array}
 */
module.exports.getList = () => {
	const r = [];
	for(const i in torrents) {
		r.push(torrents[i].toString());
	}
	return r;
};

/**
 * @param _torrent
 * @return {Promise.<*>}
 */
module.exports.pause = async(_torrent) => {
	if((typeof _torrent) === 'string') {
		_torrent = new Torrent(_torrent);
	}
	const torrent = module.exports.getTorrent(_torrent);
	if(torrent === null) {
		throw new Error('Torrent does not exists');
	}

	try {
		const result = await clientTorrent.pause(torrent.hash);
		lDebug(`PAUSE : ${result}`);
		torrent.playing = false;
		torrent.active = false;
		listenerHandler.on(listenerHandler.EVENT.PAUSED, torrent);
		return torrent;
	} catch(e) {
		throw e;
	}

};

/**
 * @param _torrent
 * @return {Promise.<*>}
 */
module.exports.resume = async(_torrent) => {
	if((typeof _torrent) === 'string') {
		_torrent = new Torrent(_torrent);
	}
	const torrent = module.exports.getTorrent(_torrent);
	if(torrent === null) {
		throw new Error('Torrent does not exists');
	}

	try {
		const result = await clientTorrent.resume(torrent.hash);
		lDebug(`RESUME : ${result}`);
		torrent.active = true;
		listenerHandler.on(listenerHandler.EVENT.RESUMED, torrent);
		return torrent;
	} catch(e) {
		throw e;
	}
};

/**
 * @param _torrent
 * @return {Promise.<boolean>}
 */
module.exports.delete = async(_torrent) => {
	if((typeof _torrent) === 'string') {
		_torrent = new Torrent(_torrent);
	}
	const torrent = module.exports.getTorrent(_torrent);
	if(torrent === null) {
		throw new Error('Torrent does not exists');
	}

	try {
		const result = await clientTorrent.delete(torrent.hash);
		torrents.splice(torrents.indexOf(torrent), 1);
		lDebug(`Torrent removed ${torrent.hash}`);
		listenerHandler.on(listenerHandler.EVENT.REMOVED, torrent);
		return true;
	} catch(e) {
		throw e;
	}
};

/**
 * Check state torrent, diff with static list and client torrent
 * @param list
 * @return {Promise.<void>}
 */
module.exports.checkState = async(list) => {
	for(const i in torrents) {
		const index = list.indexOf(torrents[i].hash);
		if(index === -1) {
			lDebug(`Torrent removed ${torrents[i].hash}`);
			listenerHandler.on(listenerHandler.EVENT.REMOVED, torrents[i]);
			torrents.splice(i, 1);
		}
	}
};