/**
 * Created by MaximeMaillet on 31/05/2017.
 */
"use strict";

function torrent(hash, listener) {

	this.torrent = {
		hash: hash
	};

	this.watch = (listener) => {

	};

	this.bind = (data) => {
		Object.assign(this.torrent, data);
	};
}

module.exports = torrent;