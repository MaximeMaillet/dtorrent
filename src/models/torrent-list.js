'use strict';

const debug = require('debug');
const watchObject = require('watch-object');
const clientTorrent = require('../clients/rTorrent');

const {watch, unwatch} = watchObject;
const lError = debug('dTorrent:model:error');
const lDebug = debug('dTorrent:model:debug');

const EVENT_TORRENT_ADDED = 'torrent_added';
const EVENT_TORRENT_UPLOADING = 'torrent_uploading';
const EVENT_TORRENT_DOWNLOADING = 'torrent_downloading';
const EVENT_TORRENT_FINISHED = 'torrent_finished';

/**
 * @type {TorrentList}
 */
module.exports = TorrentList;

function TorrentList() {

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
	this.isExists = (torrent) => {
		for(let i=0; i<this.list.length; i++) {
			if(this.list[i].hash === torrent.hash) {
					return true;
			}
		}

		return false;
	};

	/**
	 * Add a torrent in static list
	 * @param hash
	 * @return {boolean}
	 */
	this.check = (hash) => {
		if(!this.isExists({hash})) {
			this.list.push({hash: hash, is_filled: false, is_finished: false});
		} else {
			this.update(hash);
		}
	};

	/**
	 *
	 * @param event
	 * @param torrent
	 */
	this.onEvent = (event, torrent, changes) => {
		switch(event) {
			case EVENT_TORRENT_ADDED:
				lDebug(`Torrent added : ${torrent.hash}`);
				this.listener.onInsert(torrent);
				break;
			case EVENT_TORRENT_UPLOADING:
				this.listener.onUpload(torrent);
				break;
			case EVENT_TORRENT_DOWNLOADING:
				this.listener.onDownload(torrent);
				break;
			case EVENT_TORRENT_FINISHED:
				unwatch(torrent);
				this.listener.onFinished(torrent);
				break;
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
	 * Get torrent by her hash in current list
	 * @param hash
	 * @returns {Promise}
	 */
	this.getTorrentFromList = (hash) => {
		for(let i=0; i<this.list.length; i++) {
			if(this.list[i].hash === hash) {
				return this.list[i];
			}
		}
		return null;
	};

	/**
	 * @param hash
	 * @return {Promise.<void>}
	 */
	this.fillTorrent = async(hash) => {
		const torrent = await this.getTorrent(hash);
		this.watchTorrent(torrent);
		torrent.is_filled = true;
	};

	/**
	 * @param torrent
	 */
	this.watchTorrent = (torrent) => {
		const self = this;
		watch(torrent, ['mb_uploaded', 'mb_downloaded', 'is_filled', 'is_finished'], (newState, oldState, property) => {
			if(property === 'is_filled' && newState) {
				self.onEvent(EVENT_TORRENT_ADDED, torrent);
			} else if(property === 'mb_uploaded') {
				self.onEvent(EVENT_TORRENT_UPLOADING, torrent, [newState, oldState]);
			} else if(property === 'mb_downloaded') {
				self.onEvent(EVENT_TORRENT_DOWNLOADING, torrent, [newState, oldState]);

				if(torrent.progress === 100) {
					torrent.is_finished = true;
				}
			} else if(property === 'is_finished' && newState) {
				self.onEvent(EVENT_TORRENT_FINISHED, torrent);
			}
		});
	};

	/**
	 * @param hash
	 * @return {Promise.<void>}
	 */
	this.update = async(hash) => {
		const newTorrent = await this.getTorrent(hash);
		const oldTorrent = this.getTorrentFromList(hash);
		const changes = await this.getChanges(oldTorrent, newTorrent);

		if(changes.length > 0) {
			changes.forEach((field) => {
				oldTorrent[field] = newTorrent[field];
			});
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
			const excludeField = ['is_valid'];
			const arrayReturn = [];
			const sizeTotal = Object.keys(original).length;
			let i=0;

			Object.keys(original).map((objectKey, index) => {
				i++;
				if(excludeField.indexOf(objectKey) === -1 && original[objectKey] !== newValues[objectKey]) {
					arrayReturn.push(objectKey);
				}

				if(i === sizeTotal-1) {
					resolve(arrayReturn);
				}
			});
		});
	};

	/**
	 * Watch array list of torrent
	 */
	watch(this.list, (added, removed, index, action) => {
		if(action === 'push') {
			if(!this.list[index].is_filled) {
				this.fillTorrent(this.list[index].hash);
			} else {
				this.onEvent(EVENT_TORRENT_ADDED, this.list[index]);
			}
		}
	});
}