require('dotenv').config();
const get = require('lodash.get');
const fs = require('fs');
const path = require('path');
const parseTorrent = require('parse-torrent');
const {getDataTorrentFromFile} = require('../utils/torrent');

class Torrent {
  constructor(hash, torrent) {
    this.watchedKeys = [
      'downloaded', 'uploaded', 'ratio'
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
   * @param shouldUpdate
   * @return {Torrent}
   */
  merge(torrent, shouldUpdate) {
    this.hash = get(torrent, 'infoHash', this.hash);
    this.name = get(torrent, 'name', 'N/A');
    this.total = get(torrent, 'length', 0);
    this.path = get(torrent, 'path', null);

    if(this.path !== null) {
      this.path = `${process.env.DIR_TORRENT}${this.path}`;
    }

    const dataFiles = getDataTorrentFromFile(path.resolve(this.path));
    this.files = this.getFiles(dataFiles.files);

    this.downloaded = get(torrent, 'downloaded', this.downloaded);
    this.uploaded = get(torrent, 'uploaded', this.uploaded);
    this.ratio = get(torrent, 'ratio', this.ratio);
    this.extra = get(torrent, 'extra', this.extra);

    torrent = null;
    if(shouldUpdate) {
      this.update();
    }
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
        path: `${process.env.DIR_DOWNLOADED}${buffer[i].path}`,
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
  updateDiff(torrent, diff) {
    if(diff.indexOf('downloaded') !== -1 || diff.indexOf('uploaded') !== -1) {
      this.active = true;
    }

    if(diff.indexOf('ratio') !== -1) {
      this.ratio = torrent.ratio;
    }

    this.update();
  }

  update() {
    this.progress = Math.round((this.downloaded*100) / this.total);

    if(this.progress === 100) {
      this.finished = true;
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