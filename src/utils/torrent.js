const parseTorrent = require('parse-torrent');
const fs = require('fs');

/**
 * Read torrent content then return result
 * @param torrentFile
 * @return {Object}
 */
function getDataTorrentFromFile(torrentFile) {
  if(!fs.existsSync(torrentFile)) {
    throw new Error(`This torrent file does not exists : ${torrentFile}`);
  }

  const torrent = parseTorrent(fs.readFileSync(torrentFile));
  torrent.path = torrentFile;
  torrent.hash = torrent.infoHash.toUpperCase();
  return torrent;
}

module.exports = {
  getDataTorrentFromFile,
};