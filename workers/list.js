/**
 * Created by MaximeMaillet on 30/05/2017.
 */
"use strict";

var debug = require('debug');
const lDebug = debug('dTorrent:worker.list:debug');
const lError = debug('dTorrent:worker.list:error');

/**
 * Resolve list of hash
 * @param client
 * @param model
 * @returns {Promise}
 */
module.exports.start = function(client, model) {
	lDebug('Worker list start');
	client.list()
		.then((result) => {
			for(var i=0; i<result.length; i++) {
				model.add(result[i])
					.then((torrent) => {
						lDebug("Torrent add : %s", torrent.hash);
					})
					.catch((error) => {
					console.log(error);
						if(error.exception != 'FailedData') {
							lError("Exception %s : %s", error.exception, error.message);
						}
					})
			}
		})
		.catch((error) => {
		console.log(error);
			lError("Exception %s : %s", error.exception, error.message);
		});
};