require('dotenv').config();
const get = require('lodash.get');

class Torrent {
  constructor(hash, torrent) {
    this.watchedKeys = [
      'active', 'playing', 'progress', 'downloaded', 'uploaded', 'ratio'
    ];

    this.pid = null;
    this.hash = hash;
    this.name= get(torrent, 'name', null);
    this.active= false;
    this.finished= false;
    this.playing= false;
    this.progress= 0;
    this.downloaded= 0;
    this.uploaded= 0;
    this.total= get(torrent, 'total', 0);
    this.ratio= 0;
    this.extra= {};
    this.path= get(torrent, 'path', '');
    this.files = get(torrent, 'files', []);
  }

  addPid(pid) {
    this.pid = pid;
  }

  /**
   * @param torrent
   * @return {Torrent}
   */
  merge(torrent) {
    this.hash = get(torrent, 'infoHash', this.hash);
    this.name = get(torrent, 'name', 'N/A');
    this.total = get(torrent, 'length', 0);
    this.files = this.getFiles(torrent.files);
    this.path = `${process.env.STORAGE}/dtorrent/torrent/${this.name}.torrent`;

    this.downloaded = get(torrent, 'downloaded', this.downloaded);
    this.uploaded = get(torrent, 'uploaded', this.uploaded);
    this.ratio = get(torrent, 'ratio', this.ratio);
    this.progress = get(torrent, 'progress', this.progress);
    this.playing = get(torrent, 'playing', this.playing);
    this.active = get(torrent, 'active', this.active);
    this.extra = get(torrent, 'extra', this.extra);

    torrent = null;
    return this;
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
        path: `${process.env.STORAGE}/dtorrent/downloaded/${buffer[i].path}`,
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
   * @param torrent
   * @param diff
   */
  update(torrent, diff) {
    for(const i in diff) {

      if(diff[i] === 'downloaded') {
        this.playing = true;
        this.progress = Math.round((torrent.downloaded*100) / torrent.size);
      }

      if(this.progress === 100) {
        this.finished = true;
      }

      if(diff[i] === 'uploaded') {
        this.playing = true;
      }

      this[diff[i]] = torrent[diff[i]];
    }
  }

  toString() {
    return {
      hash: this.hash,
      name: this.name,
      active: this.active,
      finished: this.finished,
      playing: this.playing,
      progress: this.progress,
      downloaded: this.downloaded,
      uploaded: this.uploaded,
      total: this.total,
      ratio: this.ratio,
      extra: this.extra,
      path: this.path,
      files: this.files,
    };
  }
}

module.exports = Torrent;