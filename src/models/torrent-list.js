require('dotenv').config();

const debug = require('debug');
const clientTorrent = require('../clients/rTorrent');
const mongoose = require('mongoose');

const lError = debug('dTorrent:model:error');
const lDebug = debug('dTorrent:model:debug');

const watchTorrentChanges = ['mb_downloaded', 'mb_uploaded'];
const EVENT_TORRENT_ADDED = 'torrent_added';
const EVENT_TORRENT_FINISHED = 'torrent_finished';
const EVENT_TORRENT_SETTED = 'torrent_setted';

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

	/**
	 * Listener
	 * @type {null}
	 */
	this.listener = null;

	/**
	 * Method for add listener
	 * @param listener
	 */
	this.addListener = (listener) => {
		this.listener = listener;
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
				is_finished: false}
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
	 * @return {Promise.<void>}
	 * @param _torrent
	 */
	this.fillTorrent = async(_torrent) => {
		try {
			const torrent = await this.getTorrent(_torrent.hash);
			torrent.is_filled = true;
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

			for(let i=0; i<watchTorrentChanges.length; i++) {
				if(original[watchTorrentChanges[i]] !== newValues[watchTorrentChanges[i]]) {
					arrayReturn.push(watchTorrentChanges[i]);
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
				const t = new Torrent(torrent);
				t.save();
				lDebug(`Torrent added : ${torrent.hash}`);
				this.listener.onInsert(torrent);
				break;
			case EVENT_TORRENT_SETTED:
				if(changes === 'mb_uploaded') {
					await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
						'mb_uploaded': torrent.mb_uploaded
					}});
					lDebug(`Torrent uploaded ${torrent.hash}`);
					this.listener.onUpload(torrent);
				} else if(changes === 'mb_downloaded') {
					await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
						'mb_downloaded': torrent.mb_downloaded
					}});
					lDebug(`Torrent downloaded ${torrent.hash}`);
					this.listener.onDownload(torrent);
					this.updateProgress(torrent);
				}
				break;
			case EVENT_TORRENT_FINISHED:
				await Torrent.findOneAndUpdate({'hash': torrent.hash}, {$set:{
					is_finished: true
				}});
				this.listener.onFinished(torrent);
				break;
		}
	};
}