require('dotenv').config();
const get = require('lodash.get');
const servers = require('../../index');

class Torrent {
  constructor(pid, hash) {
    this.watchedKeys = [
      'downloaded', 'uploaded', 'active'
    ];

    this.server = null;
    this.pid = pid;
    this.hash = hash;
    this.name = 'N/A';
    this.length = 0;
    this.active = false;
    this.downloaded = 0;
    this.uploaded = 0;
    this.extra = {};
    this.path = '';

    this.ratio = 0;
    this.finished = false;
    this.progress = 0;
    this.files = [];
    this.playing = false;
  }

  /**
   * @param torrent
   * @param diff
   * @return {Torrent}
   */
  merge(torrent, diff) {
    this.server = get(torrent, 'server', this.server);
    this.hash = get(torrent, 'hash', this.hash);
    this.name = get(torrent, 'name', this.name);
    this.length = get(torrent, 'length', this.length);
    this.path = get(torrent, 'path', this.path);
    this.downloaded = get(torrent, 'downloaded', this.downloaded);
    this.uploaded = get(torrent, 'uploaded', this.uploaded);
    this.extra = get(torrent, 'extra', this.extra);
    this.active = get(torrent, 'active', this.active);

    torrent = null;
    this.update(diff);
    return this;
  }

  /**
   * Update volatile attributes
   */
  update(diff) {
    this.progress = Math.round((this.downloaded*100) / this.length);
    this.finished = this.progress === 100;
    this.ratio = (this.uploaded / this.downloaded).toFixed(4);

    if(
      diff && diff.length > 0 &&
      this.active &&
      (diff.indexOf('downloaded') !== -1 || diff.indexOf('uploaded') !== -1)
    ) {
        this.playing = true;
    } else {
      this.playing = false;
    }
  }

  /**
   * @param buffer
   * @return {Array}
   */
  getFiles(buffer) {
    const arrayReturn = [];
    for(const i in buffer) {
      arrayReturn.push({
        name: buffer[i].name,
        path: buffer[i].path,
        length: buffer[i].length,
      });
    }

    return arrayReturn;
  }

  /**
   * @param torrent
   * @return {Array}
   */
  getDiff(torrent) {
    const diff = [];
    for(const i in this.watchedKeys) {
      if(this[this.watchedKeys[i]] !== torrent[this.watchedKeys[i]]) {
        diff.push(this.watchedKeys[i]);
      }
    }
    return diff;
  }

  /**
   * Formated displaying
   * @return {{hash: *, name: (string|*), active: (boolean|*), downloaded: (number|*), uploaded: (number|*), length: (number|*), path: (string|*), extra: *, ratio: (number|*), finished: (boolean|*), files: (Array|*), progress: (number|*), pid: (Number|*), total: (number|*)}}
   */
  toString() {
    const server = servers.getServer(this.pid);
    return {
      server: server ? server.config.name : null,
      hash: this.hash,
      name: this.name,
      active: this.active,
      downloaded: this.downloaded,
      uploaded: this.uploaded,
      length: this.length,
      path: this.path,
      extra: this.extra,
      progress: this.progress,
      ratio: this.ratio,
      finished: this.finished,
      playing: this.playing,
      files: this.files,
    };
  }

  /**
   * @returns {string[]}
   */
  static requiredAttributes() {
    return ['hash', 'name', 'length', 'active', 'downloaded', 'uploaded', 'path'];
  }
}

module.exports = Torrent;