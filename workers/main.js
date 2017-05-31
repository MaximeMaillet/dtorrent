/**
 * Created by MaximeMaillet on 30/05/2017.
 */
'use strict';

var debug = require('debug');
const lDebug = debug('dTorrent:worker.main');

module.exports = {

	client: null,
	rootInterval: null,
	model: null,


	init: function(config) {
		switch(config.torrent.client) {
			case 'rTorrent':
			default:
				var client = require('../clients/rTorrent');
		}

		this.client = new client(config.torrent);
	},

	start: function(config, model) {
		this.model = model;
		this.init(config);
		this.root();
	},

	root: function() {

		var root = this;
		var workers = require('./worker');

		lDebug('Launch list worker :');
		this.rootInterval = setInterval(function() {
			
			workers.list.start(root.client, root.model);
			workers.details.start(root.client, root.model);

		}, 1000);
	}
};