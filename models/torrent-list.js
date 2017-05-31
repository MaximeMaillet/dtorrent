'use strict';

var debug = require('debug');
const lDebug = debug('dTorrent:model:debug');
const lError = debug('dTorrent:model:error');

var watchObject = require('watch-object');
var watch = watchObject.watch;
var unwatch = watchObject.unwatch;
var Torrent = require('../models/torrent');

function torrentList() {

	this.list = [];

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
					return self.checkTorrent(torrent);
				})
				.then((torrent) => {
					Object.assign(torrent, {is_valid:true});
					self.list.push(torrent);
					resolve(torrent);
				})
				.catch((error) => {
					if(error.exception == 'FailedCheckData') {
						var torrent = {
							hash: hash,
							is_valid: false
						};
						self.list.push(torrent);
						self.watch(torrent);
						resolve(torrent);
					}
					else {
						reject(error);
					}
				});
		});
	};

	this.getByIndex = (index) => {
		return this.list[index];
	};


	this.bind = (data) => {
		var self = this;

		self.getByHash(data.hash)
			.then((result) => {
				Object.assign(result, data);
				result.is_valid = true;
				self.watch(result);
			})
			.catch((error) => {
				lError(error);
			});
	};

	this.watch = (torrent) => {
		watch(torrent, 'state', function (newState, oldState) {
			lDebug("Change state %s > %s", newState, oldState);
			var clientEvent = null;
			var playing = false;
			var key = global.QUEUE_KEY.SPECIFIC_TORRENT+torrent.hash;

			if(newState == TORRENT_STATE.START) {
				playing = true;
				if(oldState == TORRENT_STATE.PAUSE) {
					clientEvent = 'restart';
				}
				else {
					clientEvent = 'new';
				}
			}
			else if(newState == TORRENT_STATE.PAUSE) {
				playing = false;
				clientEvent = 'paused';
			}
			else if(newState == TORRENT_STATE.FINISHED) {
				playing = false;
				torrent.isDone = true;
				torrent.mb_downloaded = torrent.mb_total;
				torrent.progress = 100;
				clientEvent = 'finished';
			}
			else if(newState == TORRENT_STATE.ERASED) {
				clientEvent = 'erased';
			}

			lDebug("Change state : %s with event : %s", newState, clientEvent);

			if(clientEvent != null) {
				queue.send(key, JSON.stringify({
					'event': clientEvent,
					'torrent': {
						hash: torrent.hash,
						name: torrent.name,
						ratio: torrent.ratio,
						mb_downloaded: torrent.mb_downloaded,
						mb_total: torrent.mb_total,
						mb_uploaded: torrent.mb_uploaded,
						isDone: torrent.isDone,
						progress: torrent.progress,
						playing: torrent.isDone ? false : playing
					}
				}));

				if(newState == TORRENT_STATE.FINISHED || newState == TORRENT_STATE.ERASED) {
					return unwatch(torrent);
				}
			}
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