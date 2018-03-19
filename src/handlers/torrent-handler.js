const debug = require('debug');
const lDebug = debug('dTorrent:handler:debug');
const lError = debug('dTorrent:handler:error');

const clientTorrent = require('../clients/client');
const Torrent = require('../models/torrent');
const listenerHandler = require('./listener-handler');

class TorrentHandler {
  constructor(listenerHandler) {
    this.listener = listenerHandler;
    this.torrents = [];
  }

  /**
   * Handle torrent from worker
   * @param hash
   * @param pid
   * @return {Promise.<void>}
   */
  async handle(hash, pid) {
    try {
      if(this.isHashExists(hash)) {
        const torrent = this.getTorrentFromHash(hash);
        this.update(torrent);
      } else {
        const torrent = new Torrent(hash);
        torrent.addPid(pid);
        this.add(torrent);
      }
    } catch(e) {
      this.listener.on(listenerHandler.EVENT.ERROR, null, {
        message: 'Fail handle torrent',
        error: e
      });
    }
  }

  /**
   * @param torrent
   * @return {Promise.<void>}
   */
  async add(torrent) {
    try {
      const newTorrent = (await clientTorrent.getTorrent(torrent.pid, torrent.hash));
      TorrentHandler.checkRequiredAttributes(newTorrent);
      torrent.merge(newTorrent, true);
      this.torrents.push(torrent);
      lDebug(`[${torrent.pid}] Torrent added ${torrent.hash}`);
      this.listener.on(listenerHandler.EVENT.ADDED, torrent);
      if(torrent.finished) {
        this.listener.on(listenerHandler.EVENT.FINISHED, torrent);
      }
    } catch(e) {
      this.listener.on(listenerHandler.EVENT.ERROR, null, {
        message: 'Fail add torrent',
        error: e
      });
    }
  }

  /**
   * @param original
   * @return {Promise.<void>}
   */
  async update(original) {
    try {
      const torrent = (await clientTorrent.getTorrent(original.pid, original.hash));
      TorrentHandler.checkRequiredAttributes(torrent);
      const diff = original.getDiff(torrent);
      original.merge(torrent, true);

      if(diff.length > 0) {
        lDebug(`[${original.pid}] Torrent updated : ${original.hash} : ${diff.join(',')}`);
        this.listener.on(listenerHandler.EVENT.UPDATED, original, diff);

        if(diff.indexOf('downloaded') !== -1 && original.finished) {
          this.listener.on(listenerHandler.EVENT.FINISHED, original);
        }
      }
    } catch(e) {
      this.listener.on(listenerHandler.EVENT.ERROR, null, {
        message: 'Faile update torrent',
        error: e
      });
    }
  }

  /**
   * Check if hash exists
   * @param hash
   * @return {boolean}
   */
  isHashExists(hash) {
    for(const i in this.torrents) {
      if(this.torrents[i].hash === hash) {
        return true;
      }
    }

    return false;
  }

  static checkRequiredAttributes(torrent) {
    const requiredAttributes = ['hash', 'name', 'length', 'active', 'downloaded', 'uploaded', 'path'];
    const attributesMissing = [];

    for(const i in requiredAttributes) {
      if(!torrent.hasOwnProperty(requiredAttributes[i])) {
        attributesMissing.push(requiredAttributes[i]);
      }
    }

    if(attributesMissing.length > 0) {
      throw new Error(`Attributes are missings : ${attributesMissing.join(',')}`);
    }
  }

  /**
   * @param torrent
   * @return {*}
   */
  getTorrent(torrent) {
    for(const i in this.torrents) {
      if(this.torrents[i].hash === torrent.hash) {
        return this.torrents[i];
      }
    }
    return null;
  }

  /**
   * Get all torrents
   * @return {Array}
   */
  getAll(pid) {
    const arrayReturn = [];
    let list = this.torrents;

    if(pid) {
      list = list.filter((torrent) => torrent.pid === pid);
    }

    for(const i in list) {
      arrayReturn.push(this.torrents[i].toString());
    }

    return arrayReturn;
  }

  /**
   * Resume a torrent
   * @param hash
   * @return {Promise.<*>}
   */
  async resume(hash) {
    const torrent = this.getTorrentFromHash(hash);

    if(torrent === null) {
      throw new Error('Torrent does not exists');
    }

    try {
      await clientTorrent.resume(torrent.pid, torrent.hash);
      torrent.active = true;
      this.listener.on(listenerHandler.EVENT.RESUMED, torrent);
      return torrent;
    } catch(e) {
      throw e;
    }
  }

  /**
   * Put torrent in pause
   * @param hash
   * @return {Promise.<*>}
   */
  async pause(hash) {
    const torrent = this.getTorrentFromHash(hash);

    if(torrent === null) {
      throw new Error('Torrent does not exists');
    }

    try {
      await clientTorrent.pause(torrent.pid, torrent.hash);
      torrent.active = false;
      this.listener.on(listenerHandler.EVENT.PAUSED, torrent);
      return torrent;
    } catch(e) {
      throw e;
    }
  }

  /**
   * @param hash
   * @return {Promise.<boolean>}
   */
  async remove(hash) {
    const torrent = this.getTorrentFromHash(hash);

    if(torrent === null) {
      throw new Error('Torrent does not exists');
    }

    try {
      await clientTorrent.remove(torrent.pid, torrent.hash);
      this.torrents.splice(this.torrents.indexOf(torrent), 1);
      lDebug(`[${torrent.pid}] Torrent removed ${torrent.hash}`);
      this.listener.on(listenerHandler.EVENT.REMOVED, torrent);
      return true;
    } catch(e) {
      throw e;
    }
  }

  /**
   * @param hash
   * @return {*}
   */
  getTorrentFromHash(hash) {
    for(const i in this.torrents) {
      if(this.torrents[i].hash === hash) {
        return this.torrents[i];
      }
    }
    return null;
  }

  /**
   * Dedupe torrents
   * @param list
   * @param pid
   * @return {Promise.<void>}
   */
  async checkState(list, pid) {
    const torrentList = this.torrents.filter((torrent) => torrent.pid === pid);
    for(const i in torrentList) {
      const index = list.indexOf(torrentList[i].hash);
      if(index === -1) {
        lDebug(`[${torrentList[i].pid}] Torrent removed ${torrentList[i].hash}`);
        this.listener.on(listenerHandler.EVENT.REMOVED, torrentList[i]);
        this.torrents.splice(i, 1);
      }
    }
  }
}

module.exports.TorrentHandler = TorrentHandler;

