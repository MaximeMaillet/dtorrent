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
      lError(`Fail 'handle' (${hash}) : ${e.message}`);
    }
  }

  async add(torrent) {
    lDebug(`[${torrent.pid}] Torrent added ${torrent.hash}`);
    torrent.merge((await clientTorrent.getTorrent(torrent.pid, torrent.hash)));
    this.torrents.push(torrent);
    this.listener.on(listenerHandler.EVENT.ADDED, torrent);
  }

  async update(_torrent) {
    const t = (await clientTorrent.getTorrent(_torrent.pid, _torrent.hash));
    _torrent.merge(t);
    const torrent = this.getTorrent(_torrent);
    const diff = torrent.getDiff(_torrent);

    if(diff.length > 0) {
      lDebug(`[${torrent.pid}] Torrent updated : ${torrent.hash} : ${diff.join(',')}`);
      torrent.update(_torrent, diff);
      this.listener.on(listenerHandler.EVENT.UPDATED, torrent, diff);

      if(diff.indexOf('downloaded') !== -1 && torrent.finished) {
        this.listener.on(listenerHandler.EVENT.FINISHED, torrent);
      }
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
      torrent.playing = false;
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

