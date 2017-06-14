Listen your torrent client with dTorrent. You will can know when your torrent is added, finished, downloading and uploading.

## Installation

```bash
npm install dtorrent --save
```

## Features

* Lister torrent server
* Receive event when torrent is inserted, finished, downloading and uploading

## Usage

```js
/**
 * Created by MaximeMaillet on 01/06/2017.
 */

var dtorrent = require('dTorrent');

var dConfig = {
	torrent: {
		client: 'rTorrent', // Client for download torrent
		host: '127.0.0.1', // IP of client torrent
		port: 8080, // Port of client torrent
		path: '/RPC2' // Path to join client torrent via XML RPC
	}
};

var dListener = {
	/**
	 * Function called when torrent is inserted
	 * @param torrent
	 */
	onInsert: function(torrent) {
		console.log("Event insert %s", torrent.hash);
	},
	/**
	 * Function called when torrent is uploading
	 * @param torrent
	 */
	onUploaded: function(torrent) {
		console.log("event uploaded %s", torrent.hash);
	},
	/**
	 * Function called when torrent is downloading
	 * @param torrent
	 */
	onDownloaded: function(torrent) {
		console.log("event download %s", torrent.hash);
	},
	/**
	 * Function called when torrent is finished
	 * @param torrent
	 */
	onFinished: function(torrent) {
		console.log("event on finished %s", torrent.hash)
	}
};

dtorrent.start(dConfig, dListener);
```

## License

##### GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.