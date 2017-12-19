# dTorrent

Listen your [`rtorrent`](https://github.com/rakshasa/rtorrent) client with dTorrent.

##### Todo

* Independant worker (garbage collector) for clean mongodb when files are manually erased. Optionally
* Web hook on events

##### Features

* Receive event when torrent is :
    * added
    * finished
    * in progress (downloading & uploading)
    * active (play & resume)
    * remove
* Docker for rtorrent deamon (with nginx & xml-rpc) https://gitlab.deuxmax.fr/torrent/rtorrent-deamon
* Api
    * For add torrent + file
    * For get details about one torrent
    * For get list of all torrents registered
    * For play & pause
    * For soft delete
* Web socket on events
* Api for send action to rtorrent (pause, resume, erase)

## Requirements

* [nginx](#nginx)
* [rtorrent](#rtorrent)
* [mongodb](#mongodb)


## Install

```bash
npm install dtorrent --save
```

## Usage

Create index.js and write this :

```js
var dtorrent = require('dtorrent');

var dConfig = {
  rtorrent_host: '127.0.0.1', // IP of client torrent
  rtorrent_port: 8092, // Port of client torrent
  rtorrent_path: '/RPC2', // Path to join client torrent via XML RPC
  mongo_host: '127.0.0.1', // host for mongodb
  mongo_port: 27017 // port for mongodb
};

var dListener = {
  onInsert: function(torrent) {
    console.log("Event insert %s", torrent.hash);
  },
  onUploaded: function(torrent) {
    console.log("event uploaded %s", torrent.hash);
  },
  onDownloaded: function(torrent) {
    console.log("event download %s", torrent.hash);
  },
  onFinished: function(torrent) {
    console.log("event on finished %s", torrent.hash)
  }
};

// Optional, you cas use environment variable
dtorrent.addConfig(dConfig);

dtorrent.start(dConfig, dListener);
```

Or, for config :

```.env
RTORRENT_HOST=127.0.0.1
RTORRENT_PORT=8092
RTORRENT_PATH=/RPC2
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
```

## Nginx

#### Install

```bash
sudo apt-get install nginx
```

#### Configure Nginx

```
server {
  listen 80;
  server_name default_server;
  root /home/torrent/;
  location ^~ /RPC2 {
    include scgi_params;
    scgi_pass   127.0.0.1:5000;
  }
}
```

#### Start service

```bash
sudo service nginx start
```


## rTorrent

#### Install

```bash
sudo apt-get install rtorrent
```

#### Create user for specific torrent

```bash
adduser torrent
sudo su torrent

# Copy example from configuration file
cp /usr/share/doc/rtorrent/examples/rtorrent.rc ~/.rtorrent.rc

# Create dir for put your .torrent
mkdir -p /home/torrent/files

# Create directory for get files
mkdir -p /home/torrent/data
```

#### Configure .rtorrent.rc

https://doc.ubuntu-fr.org/rtorrent

```
directory = /home/torrent/in_progress
session = /home/torrent/session

max_downloads_global = 5
max_uploads_global = 10
download_rate = 5120
upload_rate = 0

port_range = 6881-6999
port_random = no

check_hash = yes

schedule = watch_directory,15,15, "load_start=/home/torrent/files/*.torrent"
system.method.set_key = event.download.finished,move_complete,"d.set_directory=/home/torrent/data"

dht = auto
dht_port = 6880
encryption = allow_incoming,require,require_rc4

# Active SCGI for that rTorrent speak with Nginx
scgi_port = localhost:5000
```

#### Start rTorrent

```bash
rTorrent
```

dtach for launch as deamon : https://doc.ubuntu-fr.org/rtorrent#rtorrent_en_daemon


## Mongodb

#### Install

[Documentation](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-debian/)


## License

##### GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.