require('dotenv').config();

const debug = require('debug');
const clientTorrent = require('../clients/rTorrent');
const mongoose = require('mongoose');

const lError = debug('dTorrent:model:error');
const lDebug = debug('dTorrent:model:debug');

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
 * @type {TorrentList}
 */
module.exports = TorrentList;

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
	 * Check if torrent is already in list
	 * @param torrent
	 * @return {boolean}
	 */
	this.isExists = async(torrent) => {
		return !!(await Torrent.findOne({'hash': torrent.hash}));
	};

	/**
	 * Add a torrent in static list
	 * @param hash
	 * @return {boolean}
	 */
	this.check = async(hash) => {
		if(!(await this.isExists({hash}))) {
			this.onEvent(EVENT_TORRENT_ADDED, (await this.fillTorrent({
				hash: hash,
				is_filled: false,
				is_finished: false,
				is_removed: false,
			}
			)));
		} else {
			this.update(hash);
		}
	};

	/**
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.getTorrent = (hash) => {
		return clientTorrent.getTorrent(hash);
	};

	/**
	 * Get torrent list
	 * @param fromDb
	 * @param details
	 * @return {Promise}
	 */
	this.getList = (fromDb, details) => {
		if(fromDb) {
			return this.getListFromDb();
		} else {
			if(details) {
				return clientTorrent.list(true);
			}
			return clientTorrent.list();
		}
	};

	/**
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.getTorrentFromDb = async(hash) => {
		const res = await Torrent.findOne({'hash': hash});
		if(res) {
			return res;
		}

		return null;
	};

	/**
	 * @return {Promise.<*>}
	 */
	this.getListFromDb = async() => {
		const res = await Torrent.find({is_removed: false});
		if(res) {
			return res;
		}

		return null;
	};

	/**
	 * @return {Promise.<void>}
	 * @param _torrent
	 */
	this.fillTorrent = async(_torrent) => {
		try {
			const torrent = Object.assign(_torrent, (await this.getTorrent(_torrent.hash)));
			torrent.is_filled = true;
			torrent.playing = true;
			return torrent;
		} catch(e) {
			throw e;
		}
	};

	/**
	 * @param hash
	 * @return {Promise.<void>}
	 */
	this.update = async(hash) => {
		try {
			const oldTorrent = await this.getTorrentFromDb(hash);
			const newTorrent = await this.getTorrent(hash);
			const changes = await this.getChanges(oldTorrent, newTorrent);

			Torrent.findOneAndUpdate({'hash': hash}, {$set:{
				'is_removed': false,
			}});

			if(changes.length > 0) {
				const self = this;
				changes.forEach((field) => {
					self.onEvent(EVENT_TORRENT_SETTED, newTorrent, field);
				});
			}
		} catch(e) {
			lError(`[update] ${e}`);
		}
	};

	/**
	 * Return array of changes between two torrents
	 * @param original
	 * @param newValues
	 * @returns {Promise}
	 */
	this.getChanges = (original, newValues) => {
		return new Promise((resolve, reject) => {
			const arrayReturn = [];

			for(let i=0; i<watchTorrentChangesForEvent.length; i++) {
				if(original[watchTorrentChangesForEvent[i]] !== newValues[watchTorrentChangesForEvent[i]]) {
					arrayReturn.push(watchTorrentChangesForEvent[i]);
				}
			}

			resolve(arrayReturn);
		});
	};

	/**
	 * @param torrent
	 */
	this.updateProgress = (torrent) => {
		Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
			'progress': torrent.progress,
		}});

		if(torrent.mb_downloaded === torrent.mb_total) {
			torrent.progress = 100;
			this.onEvent(EVENT_TORRENT_FINISHED, torrent);
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

				torrent.playing = true;
				const t = new Torrent(torrent);
				t.save();
				this.eventToListeners(EVENT_TORRENT_ADDED, torrent);
				break;
			case EVENT_TORRENT_SETTED:
				if(changes === 'mb_uploaded') {
					lDebug(`Torrent uploaded ${torrent.hash}`);
					torrent.playing = true;
					this.eventToListeners(EVENT_TORRENT_UPLOAD, torrent);
				}
				else if(changes === 'mb_downloaded') {
					lDebug(`Torrent downloaded ${torrent.hash}`);
					torrent.playing = true;
					this.eventToListeners(EVENT_TORRENT_DOWNLOAD, torrent);
					this.updateProgress(torrent);
				}
				else if(changes === 'is_active') {
					this.eventToListeners(EVENT_TORRENT_ACTIVED, torrent);
				}

				lDebug(`Torrent updated ${torrent.hash} (${changes})`);

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

				torrent.playing = false;
				await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
					'is_finished': true,
					'playing': torrent.playing
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
	 * Pause torrent
	 * @param hash
	 * @return {Promise}
	 */
	this.pause = async(hash) => {
		return clientTorrent.pause(hash);
	};

	/**
	 * Resume torrent
	 * @param hash
	 * @return {Promise}
	 */
	this.resume = async(hash) => {
		return clientTorrent.resume(hash);
	};

	/**
	 * Erase torrent
	 * @param hash
	 * @return {Promise.<*>}
	 */
	this.erase = async(hash) => {
		const torrent = await this.getTorrentFromDb(hash);
		this.onEvent(EVENT_TORRENT_ERASED, torrent);
		return true;
	};
}