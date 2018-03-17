const hh = require('http-https');
const url = require('url');

class ListenerHandler {
  constructor() {
    this.listeners = [];
    this.webhooks = [];
  }

  on(event, torrent, extra) {
    for(const i in this.listeners) {
      switch(event) {
        case module.exports.EVENT.ADDED:
          this.listeners[i].onAdded(torrent.toString());
          sendWebHook(event, torrent.toString());
          break;
        case module.exports.EVENT.REMOVED:
          this.listeners[i].onRemoved(torrent.toString());
          sendWebHook(event, torrent.toString());
          break;
        case module.exports.EVENT.UPDATED:
          this.listeners[i].onUpdated(torrent.toString(), extra);
          break;
        case module.exports.EVENT.PAUSED:
          this.listeners[i].onPaused(torrent.toString());
          sendWebHook(event, torrent.toString());
          break;
        case module.exports.EVENT.RESUMED:
          this.listeners[i].onResumed(torrent.toString());
          sendWebHook(event, torrent.toString());
          break;
        case module.exports.EVENT.FINISHED:
          this.listeners[i].onFinished(torrent.toString());
          sendWebHook(event, torrent.toString());
          break;
      }
    }
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  addWebHook(url, callback) {
    if (this.webhooks.indexOf(url) === -1) {
      this.webhooks.push({
        url: url.parse(url),
        callback
      });
    }
  }

  removeWebHook(url) {
    if(this.webhooks.indexOf(url) !== -1) {
      this.webhooks.splice(this.webhooks.indexOf(url), 1);
    }
  }
}

module.exports.ListenerHandler = ListenerHandler;

module.exports.EVENT = {
	ADDED: 'added',
	REMOVED: 'removed',
	UPDATED: 'updated',
	FINISHED: 'finished',
	RESUMED: 'resumed',
	PAUSED: 'paused',
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