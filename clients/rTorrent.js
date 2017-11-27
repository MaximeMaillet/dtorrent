/**
 * Created by MaximeMaillet on 30/05/2017.
 */
"use strict";

var Promise = require("bluebird");

function rTorrent(config) {
	var xmlrpc = require('xmlrpc');
	var client = xmlrpc.createClient({
		host: config.host || '127.0.0.1',
		port: config.port || 8080,
		path: config.path || '/RPC2',
		encoding: 'UTF-8'
	});

	this.list = () => {
		return new Promise((resolve, reject) => {
			client.methodCall('download_list', [], function (error, value) {
				if (error) {
					console.log(error.req);
					reject(error);
				}
				else {
					resolve(value);
				}
			});
		})
	};

	this.getTorrent = (hash) => {
		return new Promise((resolve, reject) => {
			var promises = [];

			/**
			 * Check data already downloaded
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_completed_bytes', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Total size of torrent
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_size_bytes', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Check rate downloaded (speed download)
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_down_rate', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Check size uploaded
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_up_total', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Check if torrent is playing or not
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.is_active', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Get name
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_name', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));
			/**
			 * Get ration up/down
			 */
			promises.push(new Promise((resolve, reject) => {
				client.methodCall('d.get_ratio', [hash], function (error, value) {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			}));

			Promise.all(promises)
				.then((result) => {
					resolve({
						hash: hash,
						name: result[5],
						progress: Math.round((result[0]*100) / result[1]),
						down_rate: result[2],
						mb_downloaded: Math.round(result[0]/(1024*1024)*100)/100,
						mb_uploaded: Math.round(result[3]/(1024*1024)*100)/100,
						mb_total: Math.round(result[1]/(1024*1024)*100)/100,
						playing: result[4] == '1',
						isDone: result[0] == result[1],
						ratio: result[6]/100
					});
				})
				.catch((error) => {
					reject(error);
				});
		});
	};
}

module.exports = rTorrent;