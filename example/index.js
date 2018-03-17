const dtorrent = require('dtorrent');

main();

async function main() {
  const dConfig = [
    {
      name: 'Server1', // server name
      interval_check: 1500, // every check on torrent server (default: 1500)
      client: require('your-client'), //default: rTorrent
      rtorrent_host: '127.0.0.1', // (For client rTorrent) IP of client torrent
      rtorrent_port: 8092, // (For client rTorrent) Port of client torrent
      rtorrent_path: '/RPC2', // (For client rTorrent) Path to join client torrent via XML RPC
    },
    {
      name: 'Server2', // server name
      interval_check: 5000, // every check on torrent server (default: 1500)
      client: require('your-client'),
    }
  ];

  /**
   * Start listener
   */
  await dtorrent.start(dConfig);

  const manager = await dtorrent.manager();

  // Add listener
  manager.addListener({
    /**
     * Function called when torrent is inserted
     * @param torrent
     */
    onInsert: function(torrent) {
      console.log('Event insert %s', torrent.hash);
    },
    /**
     * Function called when torrent is uploading
     * @param torrent
     */
    onUploaded: function(torrent) {
      console.log('event uploaded %s', torrent.hash);
    },
    /**
     * Function called when torrent is downloading
     * @param torrent
     */
    onDownloaded: function(torrent) {
      console.log('event download %s', torrent.hash);
    },
    /**
     * Function called when torrent is finished
     * @param torrent
     */
    onFinished: function(torrent) {
      console.log('event on finished %s', torrent.hash);
    }
  });

  // Add webhook
  manager.addWebHook = ('https://monwebhook.fr/hook', {
    onFailed: (url, statusCode, body, headers) => {
      // ...
    },
    onError: (url, error) => {
      // ...
    }
  });

  // Get all torrents
  manager.getAll();

  // Get all torrents for server 'Server1'
  manager.getAll('Server1');

  // Get one torrent from hash
  manager.getOne('hash');

  // Put torrent in pause from hash
  manager.pause('hash');

  // Put torrent in resume from hash
  manager.resume('hash');

  // Remove torrent from hash
  manager.remove('hash');

  // Extract data from my-file.torrent
  manager.extractTorrentFile('torrentFile.torrent');

  // Put torrent on server 'Server1'
  manager.createFromTorrent('torrentFile.torrent', 'Server1');

  // Put torrent + data on server 'Server1'
  manager.createFromTorrentAndData('mytorrent.mp4.torrent', 'mytorrent.mp4', 'Server1');
}