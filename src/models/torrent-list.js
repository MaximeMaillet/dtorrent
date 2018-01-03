require('dotenv').config();

const debug = require('debug');
const clientTorrent = require('../listener/clients/rTorrent');
const mongoose = require('mongoose');

const lError = debug('dTorrent:listener:model:error');
const lDebug = debug('dTorrent:listener:model:debug');

const watchTorrentChangesForEvent = [
	'mb_downloaded', 'mb_uploaded',
	'progress', 'is_finished', 'down_rate', 'ratio', 'nb_leechers', 'nb_seeders', 'is_active'
];

const EVENT_TORRENT_ADDED = 'torrent_added';
const EVENT_TORRENT_FINISHED = 'torrent_finished';
const EVENT_TORRENT_SETTED = 'torrent_setted';
const EVENT_TORRENT_DOWNLOAD = 'torrent_download';
const EVENT_TORRENT_UPLOAD = 'torrent_upload';
const EVENT_TORRENT_ACTIVED = 'torrent_active';
const EVENT_TORRENT_ERASED = 'torrent_erased';

/**
 * @deprecated
 * @type {TorrentList}
 */
module.exports = TorrentList;

/**
 * @deprecated
 * @constructor
 */
function TorrentList() {
	/**
	 * @type {mongoose.Schema}
	 */
	const torrentSchema = require('./torrent.mg');
	const Torrent = mongoose.model('Torrent', torrentSchema);

	/**
	 * Array of torrent
	 * @type {Array}
	 */
	this.list = [];

	this.listeners = [];

	/**
	 * Check if torrent exists and add or update
	 * @param hash
	 * @return {boolean}
	 */
	this.update = async(hash) => {
		if(!(await this.isExists({hash}))) {
			this.onEvent(EVENT_TORRENT_ADDED, {'hash': hash});
		} else {
			const oldTorrent = await this.getFromDb(hash);
			const newTorrent = await this.get(hash);
			const changes = this.getChanges(oldTorrent, newTorrent);

			if(changes.length > 0) {
				this.onEvent(
					EVENT_TORRENT_SETTED,
					(await this.get(hash)),
					changes
				);
			}
		}
	};

	/**
	 * @param event
	 * @param torrent
	 * @param changes
	 */
	this.onEvent = async(event, torrent, changes) => {
		switch(event) {
			case EVENT_TORRENT_ADDED:
				lDebug(`Torrent added : ${torrent.hash}`);
				try {
					let newTorrent = await this.get(torrent.hash);
					newTorrent = Object.assign(newTorrent, {
						playing: true,
						is_finished: newTorrent.progress === 100,
						is_removed: false,
					});
					(new Torrent(newTorrent)).save();
					this.eventToListeners(EVENT_TORRENT_ADDED, newTorrent);
				} catch(e) {
					throw {message: 'waiting'};
				}
				break;
			case EVENT_TORRENT_SETTED:
				lDebug(`Torrent updated ${torrent.hash} (${changes})`);

				if(changes.indexOf('mb_uploaded') !== -1) {
					torrent.playing = true;
					this.eventToListeners(EVENT_TORRENT_UPLOAD, torrent);
				}
				else if(changes.indexOf('mb_downloaded') !== -1) {
					torrent.playing = true;
					this.eventToListeners(EVENT_TORRENT_DOWNLOAD, torrent);
				}
				else if(changes.indexOf('is_active') !== -1) {
					this.eventToListeners(EVENT_TORRENT_ACTIVED, torrent);
				}

				await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
					'playing': torrent.playing,
					'progress': torrent.progress,
					'is_finished': torrent.progress === 100,
					'down_rate': torrent.down_rate,
					'ratio': torrent.ratio,
					'nb_leechers': torrent.nb_leechers,
					'nb_seeders': torrent.nb_seeders,
					'is_active': torrent.is_active,
					'mb_downloaded': torrent.mb_downloaded,
					'mb_uploaded': torrent.mb_uploaded,
				}});
				this.eventToListeners(EVENT_TORRENT_SETTED, torrent);
				break;
			case EVENT_TORRENT_FINISHED:
				lDebug(`Torrent finished ${torrent.hash}`);

				await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
					'is_finished': true,
					'playing': false,
				}});
				this.eventToListeners(EVENT_TORRENT_FINISHED, torrent);
				break;
			case EVENT_TORRENT_ERASED:
				await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
					'is_removed': true
				}});
				this.eventToListeners(EVENT_TORRENT_ERASED, torrent);
				break;
		}
	};

	/**
	 * @param event
	 * @param torrent
	 */
	this.eventToListeners = (event, torrent) => {
		this.listeners.map((listener) => {
			switch(event) {
				case EVENT_TORRENT_ADDED:
					listener.onInsert(torrent);
					break;
				case EVENT_TORRENT_SETTED:
					listener.onUpdated(torrent);
					break;
				case EVENT_TORRENT_ACTIVED:
					listener.onActive(torrent);
					break;
				case EVENT_TORRENT_DOWNLOAD:
					listener.onDownload(torrent);
					break;
				case EVENT_TORRENT_UPLOAD:
					listener.onUpload(torrent);
					break;
				case EVENT_TORRENT_FINISHED:
					listener.onFinished(torrent);
					break;
				case EVENT_TORRENT_ERASED:
					listener.onRemove(torrent);
					break;
			}
		});
	};

	/**
	 * Method for add listener
	 * @param listener
	 */
	this.addListener = (listener) => {
		this.listeners.push(listener);
	};

	/**
	 * Remove listener
	 * @param listener
	 */
	this.removeListener = (listener) => {
		const index = this.listeners.indexOf(listener);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	};

	/**
	 * Erase torrent
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.erase = async(hash) => {
		const torrent = await this.getFromDb(hash);
		this.onEvent(EVENT_TORRENT_ERASED, torrent);
		return true;
	};

	/**
	 * Pause torrent
	 * @param hash
	 * @return {Promise}
	 */
	this.pause = async(hash) => {
		const torrent = this.getFromDb(hash);
		torrent.playing = false;
		this.onEvent(EVENT_TORRENT_SETTED, torrent, ['playing']);
		return clientTorrent.pause(hash);
	};

	/**
	 * Resume torrent
	 * @param hash
	 * @return {Promise}
	 */
	this.resume = async(hash) => {
		const torrent = this.getFromDb(hash);
		torrent.playing = true;
		this.onEvent(EVENT_TORRENT_SETTED, torrent, ['playing']);
		return clientTorrent.resume(hash);
	};

	/**
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.get = (hash) => {
		return clientTorrent.getTorrent(hash);
	};

	/**
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.getFromDb = async(hash) => {
		return await Torrent.findOne({'hash': hash});
	};

	/**
	 * Get all torrent from DB
	 * @return {Promise}
	 */
	this.getList = async() => {
		return await Torrent.find({'is_removed': false});
	};

	/**
	 * Check if torrent is already in list
	 * @param torrent
	 * @return {boolean}
	 */
	this.isExists = async(torrent) => {
		return !!(await Torrent.findOne({'hash': torrent.hash}));
	};

	/**
	 * Return array of changes between two torrents
	 * @param original
	 * @param newValues
	 * @returns {Promise}
	 */
	this.getChanges = (original, newValues) => {
		const arrayReturn = [];

		for(let i=0; i<watchTorrentChangesForEvent.length; i++) {
			if(original[watchTorrentChangesForEvent[i]] !== newValues[watchTorrentChangesForEvent[i]]) {
				arrayReturn.push(watchTorrentChangesForEvent[i]);
			}
		}

		return arrayReturn;
	};
}