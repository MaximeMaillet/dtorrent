'use strict';

var debug = require('debug');
const lDebug = debug('dTorrent:model:debug');
const lError = debug('dTorrent:model:error');

var watchObject = require('watch-object');
var watch = watchObject.watch;
var unwatch = watchObject.unwatch;

function torrentList() {

	this.list = [];

	this.listener = null;

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

	this.getByIndex = (index) => {
		return this.list[index];
	};

	this.isBind = (torrent) => {
		for(var i=0; i<this.list.length; i++) {
			if(this.list[i].hash == torrent.hash) {
				return this.list[i].is_valid;
				break;
			}
		}
		return false;
	};

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




	this.size = function() {
		return this.list.length;
	};

	this.getInvalidByIndex = function(index) {
		return new Promise((resolve, reject) => {
			var torrent = this.list[index];
			if(torrent == undefined) {
				reject({exception: 'FailedData', code: 30, message:'Torrent does not exists'});
			}

			if(!torrent.is_valid) {
				resolve(torrent);
			}
		});
	};



	this.getByHash = function(hash) {
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

	this.isValid = function(hash) {
		for(var i=0; i<this.list.length; i++) {
			if(this.list[i].hash == hash) {
				return this.list[i].is_valid;
			}
		}
	}
};

module.exports = new torrentList();