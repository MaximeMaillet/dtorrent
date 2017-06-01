'use strict';

var debug = require('debug');
const lError = debug('dTorrent:model:error');

var watchObject = require('watch-object');
var watch = watchObject.watch;
var unwatch = watchObject.unwatch;

function torrentList() {

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
	 * Check data from client and return standard torrent
	 * @param data
	 * @returns {Promise}
	 */
	this.checkTorrent = (data) => {
		return new Promise((resolve, reject) => {

			if(data.hash == undefined) {
				reject({exception: 'FailedCheckData', code: 10, message:'hash is not defined'});
			}

			if(data.name == undefined) {
				reject({exception: 'FailedCheckData', code: 11, message:'name is not defined'});
			}

			if(data.mb_total == undefined) {
				reject({exception: 'FailedCheckData', code: 10, message:'Total size is not defined'});
			}

			resolve({
				hash: data.hash,
				name: data.name,
				mb_downloaded: data.mb_downloaded || 0,
				mb_uploaded: data.mb_uploaded || 0,
				mb_total: data.mb_total,
				is_done: data.mb_downloaded == data.mb_total,
				active: data.is_active || false
			});
		});
	};

	/**
	 * Check if torrent is already in list
	 * @param torrent
	 * @returns {Promise}
	 */
	this.isExists = (torrent) => {
		var list = this.list;
		return new Promise((resolve, reject) => {
			for(var i=0; i<list.length; i++) {
				if(list[i].hash == torrent.hash) {
					reject({exception: 'FailedData', code: 20, message:'Torrent is already in list'});
				}
			}
			resolve(torrent);
		});
	};

	/**
	 * Add a torrent in list
	 * @param hash
	 * @returns {Promise}
	 */
	this.add = (hash) => {
		var self = this;
		return new Promise((resolve, reject) => {
			self.isExists({hash: hash})
				.then((torrent) => {
					Object.assign(torrent, {is_valid:false});
					self.list.push(torrent);
					resolve(torrent);
				})
				.catch((error) => {
					reject(error);
				});
		});
	};

	/**
	 * Get torrent by index
	 * @param index
	 * @returns {*}
	 */
	this.getByIndex = (index) => {
		return this.list[index];
	};

	/**
	 * Return true or false if torrent is already binded
	 * @param torrent
	 * @returns {boolean}
	 */
	this.isBind = (torrent) => {
		for(var i=0; i<this.list.length; i++) {
			if(this.list[i].hash == torrent.hash) {
				return this.list[i].is_valid;
				break;
			}
		}
		return false;
	};

	/**
	 * Bind data in torrent
	 * @param data
	 */
	this.bind = (data) => {
		var self = this;

		self.getByHash(data.hash)
			.then((result) => {
				Object.assign(result, data);
				result.is_valid = true;
				self.watch(result);
				self.listener.onInsert(result);
			})
			.catch((error) => {
				lError(error);
			});
	};

	/**
	 * Update torrent if it has changed
	 * @param data
	 * @returns {Promise}
	 */
	this.update = (data) => {
		var self = this;
		return new Promise((resolve, reject) => {
			this.getByHash(data.hash)
				.then((torrent) => {

					self.getChanges(torrent, data)
						.then((changes) => {
							if(changes.length > 0) {
								changes.forEach(function(field) {
									torrent[field] = data[field];
								});
							}
							resolve(torrent);
						})
						.catch((error) => {
							console.log(error);
						});
				})
				.catch((error) => {
					reject(error);
				});
		});
	};

	/**
	 * Watch torrent properties
	 * @param torrent
	 */
	this.watch = (torrent) => {
		var self = this;
		watch(torrent, 'mb_uploaded', function(newState, oldState) {
			self.listener.onUploaded(torrent);
		});

		watch(torrent, 'mb_downloaded', function(newState, oldState) {
			self.listener.onDownloaded(torrent);

			if(torrent.progress == 100) {
				self.listener.onFinished(torrent);
				unwatch(torrent);
			}
		});
	};

	/**
	 * Return array of changes between two torrents
	 * @param original
	 * @param newValues
	 * @returns {Promise}
	 */
	this.getChanges = (original, newValues) => {
		return new Promise((resolve, reject) => {
			var excludeField = ['is_valid'];
			var arrayReturn = [];
			var sizeTotal = Object.keys(original).length;
			var i=0;

			Object.keys(original).map(function(objectKey, index) {
				i++;
				if(excludeField.indexOf(objectKey) == -1 && original[objectKey] != newValues[objectKey]) {
					arrayReturn.push(objectKey);
				}

				if(i == sizeTotal-1) {
					resolve(arrayReturn);
				}
			});
		});
	};

	/**
	 * Return size of list
	 * @returns {Number}
	 */
	this.size = () => {
		return this.list.length;
	};

	/**
	 * Get torrent by her hash
	 * @param hash
	 * @returns {Promise}
	 */
	this.getByHash = (hash) => {
		var self = this;
		return new Promise((resolve, reject) => {
			for(var i=0; i<self.list.length; i++) {
				if(self.list[i].hash == hash) {
					resolve(self.list[i]);
				}
			}
			reject({exception: 'FailedData', code: 30, message:'Torrent does not exists'});
		});
	};
};

module.exports = new torrentList();