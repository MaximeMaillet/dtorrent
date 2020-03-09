const debug = require('debug');
const lDebug = debug('dTorrent:worker:list:debug');
const lError = debug('dTorrent:worker:list:error');

const clientTorrent = require('../clients/client');
const Torrent = require('../models/torrent');
const listener = require('./listener');
const {getDataTorrentFromMetaData} = require('../utils/torrent');

const torrents = [];

module.exports.handle = async(pid, hash) => {
  let index = -1;
  const hashTorrentList = torrents.map((t) => t.hash);

  if((index = hashTorrentList.indexOf(hash)) === -1) {
    return {
      ...(await add(pid, hash)),
      isNew: true,
    };
  } else {
    return {
      ...(await update(pid, hash, index)),
      isNew: false,
    };
  }
};

/**
 * @param hash
 * @param files
 */
module.exports.handleFiles = (hash, files) => {
  const hashTorrentList = torrents.map((t) => t.hash);
  const index = hashTorrentList.indexOf(hash);
  if(index !== -1) {
    torrents[index].files = files;
    listener.on(listener.EVENT.UPDATED, torrents[index], ['files']);
  }
};

/**
 * @param pid
 * @param hash
 * @returns {Promise<void>}
 */
const add = async(pid, hash) => {
  const torrentMetaData = await clientTorrent.getTorrent(pid, hash);
  const torrent = new Torrent(hash);
  torrent.merge(torrentMetaData);
  torrents.push(torrent);
  listener.on(listener.EVENT.ADDED, torrent);
  return torrent;
};

/**
 * @param pid
 * @param hash
 * @param index
 * @returns {Promise<void>}
 */
const update = async(pid, hash, index) => {
  const torrentMetaData = await clientTorrent.getTorrent(pid, hash);
  const torrent = torrents[index];
  const diff = torrent.getDiff(torrentMetaData);
  torrent.merge(torrentMetaData);

  if(diff.length > 0) {
    lDebug(`[${pid}] Torrent updated : ${hash} : ${diff.join(',')}`);
    listener.on(listener.EVENT.UPDATED, torrent, diff);

    if(diff.indexOf('downloaded') !== -1 && torrentMetaData.finished) {
      listener.on(listener.EVENT.FINISHED, torrent);
    }
  }
};