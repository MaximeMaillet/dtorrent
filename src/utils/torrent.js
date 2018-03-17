const parseTorrent = require('parse-torrent');
const fs = require('fs');

/**
 * Read torrent content then return result
 * @param torrentFile
 * @return {Object}
 */
function getDataTorrentFromFile(torrentFile) {
  if(!fs.existsSync(torrentFile)) {
    return {};
  }

  const torrent = parseTorrent(fs.readFileSync(torrentFile));
  let l = 0;
  for(const j in torrent.info.files) {
    l += torrent.info.files[j].length;
  }
  torrent.info.total_size = l;
  torrent.info.destination = torrentFile;
  torrent.infoHash = torrent.infoHash.toUpperCase();
  return torrent;
}

module.exports = {
  getDataTorrentFromFile,
};