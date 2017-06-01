/**
 * Created by MaximeMaillet on 30/05/2017.
 */
'use strict';

var debug 		= require('debug');
const lServer = debug('dTorrent:listener.server');

module.exports = {

	start: function(config, listener) {


		/**
		 * Initialize model
		 * @type {torrentList}
		 */
		var model = require('./torrent-list');

		var tListener = {
			onInsert: function(torrent) {
				console.log("Event insert %s", torrent.hash);
			},
			onUploaded: function(torrent) {
				console.log("event uploaded %s", torrent.hash);
			},
			onDownloaded: function(torrent) {
				console.log("event download %s", torrent.hash);
			},
			onFinished: function(torrent) {
				console.log("event on finished %s", torrent.hash)
			}
		};

		/**
		 * Server which listen torrents list on rTorrent
		 */
		var mainWorker = require('./workers/main');
		lServer('Start main worker');
		mainWorker.init(config, model, tListener)
			.then((model) => {
				mainWorker.start(model);
			})
			.catch((error) => {
				console.log(error);
			})
	}
};