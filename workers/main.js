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
	listener: null,
	
	init: function(config, model, listener) {
		return new Promise((resolve, reject) => {
			// TODO check listener
			this.model = model;
			this.model.addListener(listener);

			switch(config.torrent.client) {
				case 'rTorrent':
				default:
					var client = require('../clients/rTorrent');
			}

			this.client = new client(config.torrent);

			resolve(model);
		});
	},

	start: function() {
		this.root();
	},

	root: function() {

		var root = this;
		var workers = require('./worker');

		workers.list.start(root.client, root.model);
		workers.details.start(root.client, root.model);

		lDebug('Launch list worker :');
		this.rootInterval = setInterval(function() {
			
			workers.list.start(root.client, root.model);
			workers.details.start(root.client, root.model);

		}, 3000);
	}
};