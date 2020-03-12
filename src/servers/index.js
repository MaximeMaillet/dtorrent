const debug = require('debug');
const lDebug = debug('dTorrent:server:worker:debug');
const lError = debug('dTorrent:server:worker:error');

const clientTorrent = require('../clients/client');
const torrentHandler = require('../handlers/torrent');
const parseTorrent = require('parse-torrent');

/**
 * @param server
 * @returns {Promise<void>}
 */
module.exports.start = async(server) => {
  try {
    await clientTorrent.init(server.pid);
    await fetch(server);

    setInterval(async() => {
      await fetch(server);
    }, server.config.interval_check);

  } catch(e) {
    lError(`ServerWorkerException ${e}`);
    console.log(e);
  }
};

/**
 * @param config
 * @returns {Promise<void>}
 */
const fetch = async(config) => {
  try {
    const list = await clientTorrent.list(config.pid);
    for(let i=0; i<list.length; i++) {
      const torrent = await torrentHandler.handle(config.pid, list[i]);
      if(torrent.isNew) {
        const torrentFileContent = await getTorrentFileData(config.config, torrent.path);
        torrentHandler.handleFiles(torrent.hash, torrentFileContent.files);
      }
    }
  } catch(e) {
    lError(`ServerFetchException ${e}`);
    console.log(e);
  }
};

/**
 * @param config
 * @param torrent
 * @returns {Promise<any>}
 */
const getTorrentFileData = (config, torrent) => {
  return new Promise((resolve, reject) => {
    parseTorrent
      .remote(
        `${config.secure ? 'https' : 'http'}://${config.host}:${config.port}/torrents/${torrent}`,
        (err, parsedTorrent) => {
          if (err) {
            reject(err);
          } else {
            resolve(parsedTorrent);
          }
        }
      );
  });
};