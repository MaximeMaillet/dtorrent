const debug = require('debug');
const lDebug = debug('dTorrent:worker:list:debug');
const lError = debug('dTorrent:worker:list:error');

const {getDataTorrentFromMetaData} = require('../utils/torrent');



const clientTorrent = require('../clients/client');
const Torrent = require('../models/torrent');
const listener = require('./listener');
const torrents = [];

/**
 * @param pid
 * @param hash
 * @returns {Promise<{isNew: boolean}>}
 */
module.exports.handle = async(pid, hash) => {
  const hashTorrentList = torrents.map((t) => t.hash);
  if(hashTorrentList.indexOf(hash) === -1) {
    return {
      ...(await add(pid, hash)),
      isNew: true,
    };
  } else {
    return {
      ...(await update(pid, hash)),
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
  const torrent = new Torrent(pid, hash);
  torrent.merge(torrentMetaData);
  checkRequiredAttributes(torrent);
  torrents.push(torrent);
  listener.on(listener.EVENT.ADDED, torrent);
  return torrent;
};

/**
 * @param pid
 * @param hash
 * @returns {Promise<void>}
 */
const update = async(pid, hash) => {
  const torrentMetaData = await clientTorrent.getTorrent(pid, hash);
  const torrent = getOne(pid, hash);
  const diff = torrent.getDiff(torrentMetaData);
  checkRequiredAttributes(torrent);
  torrent.merge(torrentMetaData, diff);

  if(diff.length > 0) {
    lDebug(`[${pid}] Torrent updated : ${hash} : ${diff.join(',')}`);
    if(diff.indexOf('active') !== -1) {
      if(torrent.active) {
        listener.on(listener.EVENT.RESUMED, torrent, diff);
      } else {
        listener.on(listener.EVENT.PAUSED, torrent, diff);
      }
    }

    listener.on(listener.EVENT.UPDATED, torrent, diff);
    if(diff.indexOf('downloaded') !== -1 && torrentMetaData.finished) {
      listener.on(listener.EVENT.FINISHED, torrent);
    }
  }
  return torrent;
};

const getOne = (pid, hash) => {
  for(let i=0; i<torrents.length; i++) {
    if(torrents[i].pid === pid && torrents[i].hash === hash) {
      return torrents[i];
    }
  }

  throw new Error(`This torrent does not exists - PID : ${pid} ; Hash : ${hash}`);
};

const resume = async(pid, hash) => {
  const torrent = getOne(pid, hash);
  await clientTorrent.resume(pid, hash);
  torrent.active = true;
  listener.on(listener.EVENT.RESUMED, torrent);
  return torrent;
};

const pause = async(pid, hash) => {
  const torrent = getOne(pid, hash);
  await clientTorrent.pause(pid, hash);
  torrent.active = false;
  listener.on(listener.EVENT.PAUSED, torrent);
  return torrent;
};

const remove = async(pid, hash) => {
  const torrent = getOne(pid, hash);
  await clientTorrent.remove(pid, hash);
  torrents.splice(torrents.indexOf(torrent), 1);
  listener.on(listener.EVENT.REMOVED, torrent);
  return torrent;
};

const checkRequiredAttributes = (torrent) => {
  const requiredAttributes = Torrent.requiredAttributes();
  const attributesMissing = [];

  for(const i in requiredAttributes) {
    if(!torrent.hasOwnProperty(requiredAttributes[i])) {
      attributesMissing.push(requiredAttributes[i]);
    }
  }

  if(attributesMissing.length > 0) {
    throw new Error(`Attributes are missing : ${attributesMissing.join(',')}`);
  }
};

module.exports.torrent = {
  add,
  update,
  resume,
  pause,
  remove,
  getOne,
};