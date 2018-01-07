'use strict';

const Torrent = require('../../src/models/torrent');

const list = [];

hydrate();

module.exports.list = async(details) => {
	const _list = list.map((value) => {
		if(value.extra.removed === false) {
			return value.hash;
		}
	});
	return _list;
};

module.exports.getTorrent = async(hash) => {
	for(const i in list) {
		if(list[i].hash === hash) {
			return list[i];
		}
	}
	return {};
};

module.exports.pause = async(hash) => {
	for(const i in list) {
		if(list[i].hash === hash) {
			list[i].active = false;
			return true;
		}
	}
};

module.exports.resume = async(hash) => {
	for(const i in list) {
		if(list[i].hash === hash) {
			list[i].active = true;
			return true;
		}
	}
};

module.exports.delete = async(hash) => {
	for(const i in list) {
		if(list[i].hash === hash) {
			list[i].extra.removed = true;
			return true;
		}
	}
};

module.exports.open = async(hash) => {
	for(const i in list) {
		if(list[i].hash === hash) {
			list[i].extra.removed = false;
			return true;
		}
	}
};

function hydrate() {
	list.push(createFakeTorrent());

	const clearFirstStepAdded = setInterval(() => {
		list.push(createFakeTorrent());
		if(list.length > 5) {
			clearInterval(clearFirstStepAdded);
		}
	}, 1000);

	setInterval(() => {
		list.push(createFakeTorrent());
	}, 30000);

	setInterval(() => {
		updateTorrent();
	}, 500);
}

function updateTorrent() {
	for(const i in list) {
		const torrent = list[i];

		if(torrent.downloaded < torrent.size) {
			torrent.downloaded += Math.floor(Math.random() * 10) * 1024 * 1024;
		}

		if(torrent.downloaded > torrent.size) {
			torrent.downloaded = torrent.size;
		}

		torrent.uploaded = Math.floor(Math.random() * 10) * 1024;
		torrent.ratio = torrent.uploaded / torrent.downloaded;
	}
}

function createFakeTorrent() {
	const ID = Math.floor((Math.random() * 1000) + 1);
	return {
		hash: `F4K3H45H${ID}`,
		name: `TORRENT_NAME_${ID}`,
		active: true,
		downloaded: 0,
		uploaded: 0,
		size: Math.floor((Math.random() * 1024*10) + 1) * 1024 * 1024,
		ratio: 0,
		extra: {
			removed: false
		}
	};
}