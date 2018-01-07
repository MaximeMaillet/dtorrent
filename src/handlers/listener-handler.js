'use strict';

const hh = require('http-https');
const url = require('url');

const listeners = [];
const webhooks = [];

module.exports.EVENT = {
	ADDED: 'added',
	REMOVED: 'removed',
	UPDATED: 'updated',
	FINISHED: 'finished',
	RESUMED: 'resumed',
	PAUSED: 'paused',
};

module.exports.add = (listener) => {
	listeners.push(listener);
};

module.exports.remove = (listener) => {
	listeners.splice(listeners.indexOf(listener), 1);
};

module.exports.addWebhook = (_url, callback) => {
	if(webhooks.indexOf(url) === -1) {
		webhooks.push({
			url: url.parse(_url),
			callback
		});
	}
};

module.exports.removeWebhook = (url) => {
	if(webhooks.indexOf(url) !== -1) {
		webhooks.splice(webhooks.indexOf(url), 1);
	}
};

/**
 * @param event
 * @param torrent : Torrent
 * @param extra
 */
module.exports.on = (event, torrent, extra) => {
	for(const i in listeners) {
		switch(event) {
			case module.exports.EVENT.ADDED:
				listeners[i].onAdded(torrent.toString());
				sendWebHook(event, torrent.toString());
				break;
			case module.exports.EVENT.REMOVED:
				listeners[i].onRemoved(torrent.toString());
				sendWebHook(event, torrent.toString());
				break;
			case module.exports.EVENT.UPDATED:
				listeners[i].onUpdated(torrent.toString(), extra);
				break;
			case module.exports.EVENT.PAUSED:
				listeners[i].onPaused(torrent.toString());
				sendWebHook(event, torrent.toString());
				break;
			case module.exports.EVENT.RESUMED:
				listeners[i].onResumed(torrent.toString());
				sendWebHook(event, torrent.toString());
				break;
			case module.exports.EVENT.FINISHED:
				listeners[i].onFinished(torrent.toString());
				sendWebHook(event, torrent.toString());
				break;
		}
	}
};

/**
 * Send request to web hooks
 * @param event
 * @param torrent
 */
function sendWebHook(event, torrent) {

	for (const i in webhooks) {
		const req = hh.request({
			method: 'POST',
			port: webhooks[i].url.port,
			protocol: webhooks[i].url.protocol,
			hostname: webhooks[i].url.hostname,
			path: webhooks[i].url.path,
			headers: {
				'Content-Type': 'application/json'
			},
		}, (res) => {
			if(res.statusCode < 200 || res.statusCode > 299) {
				res.on('data', (body) => {
					webhooks[i].callback.onFailed(webhooks[i].url, res.statusCode, body.toString(), res.headers);
				});
			}
		});
		req.on('error', (e) => {
			webhooks[i].callback.onError(webhooks[i].url, e);
		});
		req.write(JSON.stringify({
			entity: 'torrent',
			event,
			torrent
		}));
		req.end();
	}
}