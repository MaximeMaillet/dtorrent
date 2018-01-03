'use strict';

const listeners = [];
const webhooks = [];

module.exports.EVENT = {
	ADDED: 'torrent_added',
	REMOVED: 'torrent_removed',
	UPDATED: 'torrent_updated',
	FINISHED: 'torrent_finished',
	RESUMED: 'torrent_resumed',
	PAUSED: 'torrent_paused',
};

module.exports.add = (listener) => {
	listeners.push(listener);
};

module.exports.remove = (listener) => {
	listeners.splice(listeners.indexOf(listener), 1);
};

module.exports.addWebhook = (url) => {
	if(webhooks.indexOf(url) === -1) {
		webhooks.push(url);
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
				break;
			case module.exports.EVENT.UPDATED:
				listeners[i].onUpdated(torrent.toString(), extra);
				break;
			case module.exports.EVENT.PAUSED:
				listeners[i].onPaused(torrent.toString());
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

function sendWebHook(event, torrent) {

}