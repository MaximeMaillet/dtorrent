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

		/**
		 * Server which listen torrents list on rTorrent
		 */
		var mainWorker = require('./workers/main');
		lServer('Start main worker');
		mainWorker.init(config, model, listener)
			.then((model) => {
				mainWorker.start(model);
			})
			.catch((error) => {
				console.log(error);
			})
	}
};