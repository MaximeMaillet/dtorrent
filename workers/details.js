/**
 * Created by MaximeMaillet on 30/05/2017.
 */
"use strict";

var debug = require('debug');
const lDebug = debug('dTorrent:worker.details:debug');
const lError = debug('dTorrent:worker.details:error');

module.exports.start = function(client, model) {
	lDebug('Worker details start');
	for(var i=0; i<model.size(); i++) {
		var torrent = model.getByIndex(i);
			client.getTorrent(torrent.hash)
				.then((result) => {

					if(!model.isBind(result)) {
						model.bind(result);
					}
					else {
						model.update(result)
							.then((newTorrent) => {
								//console.log(newTorrent);
							})
							.catch((error) => {
								console.log(error);
							})
					}
				})
				.catch((error) => {
					lError("Exception %s : %s", error.exception, error.message);
				});
	}
};