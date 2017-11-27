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

## Create rTorrent server

```bash
sudo apt-get install rtorrent
```

## Install Nginx

```bash
sudo apt-get install nginx
```

##### Configure Nginx

```
[...]
server {
    listen 8080;
    allow all;
    server_name localhost;
    root /home/torrent/;
    location ^~ /RPC2 {
        include scgi_params;
        #scgi_pass  unix:/tmp/rtorrent-listening-here.sock;
        scgi_pass   127.0.0.1:5000;
    }
}
[...]
```

##### Start service

```bash
sudo service nginx start
```

### Create user for specific torrent

```bash
adduser torrent
sudo su torrent
cp /usr/share/doc/rtorrent/examples/rtorrent.rc ~/.rtorrent.rc
```

Edit config file .rtorrent.rc (Example)

https://doc.ubuntu-fr.org/rtorrent

```
max_downloads_global = 5
max_uploads_global = 10
download_rate = 5120
upload_rate = 0
directory = /home/torrent/in_progress
session = /home/torrent/session
port_range = 6881-6999
port_random = no
check_hash = yes
schedule = watch_directory,15,15, "load_start=/home/files/torrent/files/*.torrent"
system.method.set_key = event.download.finished,move_complete,"d.set_directory=/home/files/torrent/data/;execute=mv,-u,$d.get_base_path=,/home/files/torrent/data/"
dht = auto
dht_port = 6880
encryption = allow_incoming,require,require_rc4

# Active SCGI for that rTorrent speak with Nginx
scgi_port = localhost:5000
```

Start rTorrent

```bash
rTorrent
```

dtach : https://doc.ubuntu-fr.org/rtorrent#rtorrent_en_daemon

## License

##### GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.