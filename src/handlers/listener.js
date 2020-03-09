const listeners = [];

const EVENT = {
  ADDED: 1,
  UPDATED: 2,
  FINISHED: 3,
  REMOVED: 4,
  PAUSED: 5,
  RESUMED: 6,
  ERROR: 7,
};

module.exports.addListener = (callback) => {
  listeners.push(callback)
};

module.exports.removeListener = (callback) => {
  listeners.splice(listeners.indexOf(callback), 1);
};

module.exports.on = (event, torrent, extra) => {
  for(const i in listeners) {
    switch(event) {
      case module.exports.EVENT.ADDED:
        if(listeners[i].onAdded) {
          listeners[i].onAdded(torrent.toString());
        }
        break;
      case module.exports.EVENT.REMOVED:
        if(listeners[i].onRemoved) {
          listeners[i].onRemoved(torrent.toString());
        }
        break;
      case module.exports.EVENT.UPDATED:
        if(listeners[i].onUpdated) {
          listeners[i].onUpdated(torrent.toString(), extra);
        }
        break;
      case module.exports.EVENT.PAUSED:
        if(listeners[i].onPaused) {
          listeners[i].onPaused(torrent.toString());
        }
        break;
      case module.exports.EVENT.RESUMED:
        if(listeners[i].onResumed) {
          listeners[i].onResumed(torrent.toString());
        }
        break;
      case module.exports.EVENT.FINISHED:
        if(listeners[i].onFinished) {
          listeners[i].onFinished(torrent.toString());
        }
        break;
      case module.exports.EVENT.ERROR:
        if(listeners[i].onError) {
          listeners[i].onError(extra);
        }
        break;
    }
  }
};

module.exports.EVENT = EVENT;