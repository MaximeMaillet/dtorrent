# dTorrent

Listen your favorite client bitTorrent.

#### Todo

* Web hook on events

#### Features

* Receive event when torrent is :
    * added
    * updated
    * finished
    * remove
* Manager for 
    * add torrent + file data, add torrent file, add data (and create .torrent)
    * get details about one torrent
    * get list of all torrents
    * play & resume
    * delete
* Web socket on events

## Install

```bash
npm install dtorrent --save
```

## Usage

Create index.js and write this :

```js
const dtorrent = require('dtorrent');

const dConfig = {
  rtorrent_host: '127.0.0.1', // IP of client torrent
  rtorrent_port: 8092, // Port of client torrent
  rtorrent_path: '/RPC2', // Path to join client torrent via XML RPC
  interval_check: 1500, // Interval for checks
};


await dtorrent.start(dConfig);
const manager = await dtorrent.manager();
manager.addListener({
    onAdded: async(torrent) => {
      console.log(`added : ${torrent.hash}`);
    },
    onRemoved: async(torrent) => {
        console.log(`remove : ${torrent.hash}`);
    },
    onUpdated: async(torrent, diff) => {
        console.log(`update : ${torrent.hash}`);
        console.log(diff);
    },
    onPaused: async(torrent) => {
        console.log(`pause : ${torrent.hash}`);
    },
    onResumed: async(torrent) => {
        console.log(`resume : ${torrent.hash}`);
    },
    onFinished: async(torrent) => {
        console.log(`finish : ${torrent.hash}`);
    }
});
```

Or, for config :

```.env
RTORRENT_HOST=127.0.0.1
RTORRENT_PORT=8092
RTORRENT_PATH=/RPC2
INTERVAL_CHECK=1500
```

## Manager methods

| Method | Parameters | OUT |
| ---- | ---- | ---- |
| getAll | hash | [{Torrent}, {...}] |
| getOne | hash | {Torrent} |
| resume | hash | {Torrent} |
| pause  | hash | {Torrent} |
| delete | hash | {Torrent} |
| createFromTorrent | torrent_file_path | {success, torrent} |
| createFromTorrentAndData | torrent_file_path, data_file_path | {success, torrent} |


## Client compatibilities

### rTorrent

[documentation](https://github.com/rakshasa/rtorrent)

#### Requirements

* [nginx](#nginx)
* [rtorrent](#rtorrent)

or 

* [docker](https://gitlab.deuxmax.fr/torrent/rtorrent-deamon)

#### Nginx

###### Install

```bash
sudo apt-get install nginx
```

###### Configure Nginx

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

###### Start service

```bash
sudo service nginx start
```

#### rTorrent

###### Install

```bash
sudo apt-get install rtorrent
```

###### Create user for specific torrent

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

###### Configure .rtorrent.rc

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

###### Start rTorrent

```bash
rTorrent
```

dtach for launch as deamon : https://doc.ubuntu-fr.org/rtorrent#rtorrent_en_daemon


## License

##### GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.