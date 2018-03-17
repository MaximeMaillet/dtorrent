'use strict';

const list = [];
let ID = 1;

setTimeout(() => {
	hydrate();
}, 100);

module.exports.list = async(details) => {
	return list
		.filter((value) => {
			return value.extra.removed === false;
		})
		.map((value) => {
			return value.hash;
		});
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

module.exports.remove = async(hash) => {
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
	}, 15000);

	setInterval(() => {
		updateTorrent();
	}, 500);

	setInterval(() => {
		removeTorrent();
	}, 9000);
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

		torrent.uploaded += Math.floor(Math.random() * 100) * 1024;
		torrent.ratio = Math.round((torrent.uploaded / torrent.downloaded)*100) / 1000;
	}
}

function removeTorrent() {
	for(const i in list) {
		if(list[i].extra.removed === false) {
			list[i].extra.removed = true;
			break;
		}
	}
}

function createFakeTorrent() {
	const _id = ID++;
	return {
		hash: `F4K3H45H${_id}`,
		name: `TORRENT_NAME_${_id}`,
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