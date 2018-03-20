# dTorrent - 0.5.0

Listen your favorite client bitTorrent.

dTorrent launch, every interval, request for check all torrents states and compare with actual state for return changes.

You can listen one or most server according to configure your client and your torrent server accept XML RPC request.

## Install

```bash
npm install dtorrent --save
```

## Usage

```js
const dtorrent = require('dtorrent');

const dConfig = [
  {
    name: 'MyFirstServer',
    root_path: './data', // Path where stored data
    rtorrent_host: '127.0.0.1', // Torrent server
    rtorrent_port: 80, // RPC dialogue
    interval_check: 1000, // Interval in milliseconds for check torrents on server
    client: require('./my-custom-client'), // default : rTorrent client include in lib
  },
  {
    name: 'MySecondServer',
    ...
  }
];

// Star dtorrent
await dtorrent.start(dConfig);
```

## Manager

| Method | Parameters | OUT |
| ---- | ---- | ---- |
| getAll | hash | [{Torrent}, {...}] |
| getOne | hash | {Torrent} |
| resume | hash | {Torrent} |
| pause  | hash | {Torrent} |
| delete | hash | {Torrent} |
| createFromTorrent | torrent_file_path | {success, torrent} |
| createFromTorrentAndData | torrent_file_path, data_file_path | {success, torrent} |


```javascript
const dtorrent = require('dtorrent');
await dtorrent.start();
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
    },
    onError: async(err) => {
      // ...
    }
});
```
## Webhooks

```javascript
const dtorrent = require('dtorrent');
await dtorrent.start({...});
const manager = await dtorrent.manager();
manager.addWebHook('https://monhook.com', {
  onFailed: (Url, status, body, headers) => {
    console.log(status);
    console.log(body);
    console.log(headers);
  },
  onError: (Url, err) => {
    console.log(err);
  }
});
```

## Data formated

*dTorrent return data's torrent with parameter and calculated values*

* hash
* name
* active : active or not (ready to upload or download)
* downloaded : size already downloaded
* uploaded : size already uploaded
* length : total size 
* path : name of torrent file (my-torrent.torrent)
* extra
* progress
* ratio
* finished
* playing : when torrent is uploading or downloading
* files : list of files in torrent

## Write your own client wrapper

### Method to implementate

* `list()` : send a hash's list of currents torrents

* `getTorrent(hash)` : send details about torrent
  * Attributes required : 
        * hash
        * name
        * active : active or not (downloading / uploading)
        * downloaded : size already downloaded
        * uploaded : size already uploaded
        * length : total size 
        * path : name of torrent file (my-torrent.torrent)
        * extra : (optional) for custom fields

* `pause(hash)` : put torrent in pause

* `resume(hash)` : put torrent in resume

* `remove(hash)` : remove torrent

### Add in config

```javascript
const dConfig = [
  {
      client: require('./monclient.js'),
      ...,
  }
];

await dtorrent.start(dConfig);
```

Refer to [default client](https://github.com/MaximeMaillet/dtorrent/blob/master/src/clients/rTorrent.js) for more informations


## Client compatibilities

#### Requirements

* [nginx](#nginx)
* [rtorrent](#rtorrent)

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

[documentation](https://github.com/rakshasa/rtorrent)

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

## Docker

[Documentation](https://github.com/MaximeMaillet/rtorrent-daemon)


## License

##### GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.