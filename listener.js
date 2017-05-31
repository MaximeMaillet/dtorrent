/**
 * Created by MaximeMaillet on 30/05/2017.
 */
'use strict';

var debug 		= require('debug');
const lServer = debug('dTorrent:listener.server');

module.exports = {

	start: function(config) {


		/**
		 * Initialize model
		 * @type {torrentList}
		 */
		var model = require('./models/torrent-list');

		/**
		 * Server which listen torrents list on rTorrent
		 */
		var mainWorker = require('./workers/main');
		lServer('Start main worker');
		mainWorker.start(config, model);
	}
};