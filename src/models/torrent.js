'use strict';

module.exports = Torrent;

function Torrent(hash) {
	this.model = {
		hash: hash,
		name: 'N/A',
		active: false,
		finished: false,
		playing: false,
		progress: 0,
		downloaded: 0,
		uploaded: 0,
		size: 0,
		ratio: 0,
		extra: {},
	};
	const keys = Object.keys(this.model);
	for(const i in keys) {
		this[keys[i]] = this.model[keys[i]];
	}
}

Torrent.prototype.merge = function(_torrent) {
	const keys = Object.keys(this.model);
	for(const i in keys) {
		if(_torrent[keys[i]]) {
			this[keys[i]] = _torrent[keys[i]];
		}
	}

	if(this.downloaded === this.size) {
		this.finished = true;
	}

	this.progress = Math.round((this.size*100) / this.downloaded);

	return this;
};

Torrent.prototype.getDiff = function(_torrent) {
	const ignoreFields = ['extra', 'finished'];
	const diff = [];
	const keys = Object.keys(this.model);
	for(const i in keys) {
		if(ignoreFields.indexOf(keys[i]) === -1 && this[keys[i]] !== _torrent[keys[i]]) {
			diff.push(keys[i]);
		}
	}
	return diff;
};

Torrent.prototype.update = function(_torrent, diff) {
	for(const i in diff) {

		if(diff[i] === 'downloaded') {
			this.playing = true;
			this.progress = Math.round((_torrent.size*100) / _torrent.downloaded);
			if(this.progress === 100) {
				this.finished = true;
			}
		}

		if(diff[i] === 'uploaded') {
			this.playing = true;
		}

		this[diff[i]] = _torrent[diff[i]];
	}
};

Torrent.prototype.toString = function() {
	const keys = Object.keys(this.model);
	const model = {};
	for(const i in keys) {
		model[keys[i]] = this[keys[i]];
	}
	return model;
};