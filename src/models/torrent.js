require('dotenv').config();
const path = require('path')

module.exports = Torrent;

const movieExtensions = [
  '.avi', '.mp4', '.mkv'
];

function Torrent(hash) {
	this.model = {
		hash: hash,
		name: null,
		active: false,
		finished: false,
		playing: false,
		progress: 0,
		downloaded: 0,
		uploaded: 0,
		size: 0,
		ratio: 0,
		extra: {},
		file_path: '',
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
			this.model[keys[i]] = _torrent[keys[i]];
			this[keys[i]] = _torrent[keys[i]];
		}
	}

	this.model.path = this.getPath(_torrent.extra.files);
	this.path = this.getPath(_torrent.extra.files);

	if(this.downloaded === this.size) {
		this.finished = true;
	}

	this.progress = Math.round((this.downloaded*100) / this.size);
	this.file_path = `${process.env.STORAGE}/dtorrent/torrent/${this.name}.torrent`;

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
			this.progress = Math.round((_torrent.downloaded*100) / _torrent.size);
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
  console.log(this.model);
	const model = {};
	for(const i in keys) {
		model[keys[i]] = this[keys[i]];
	}
	return model;
};

Torrent.prototype.getPath = function(buffer) {
  for(const i in buffer) {
    if(buffer[i].path[0].toString()) {
      if(movieExtensions.indexOf(path.extname(buffer[i].path[0].toString())) !== -1) {
        return `${process.env.STORAGE}/dtorrent/downloaded/${buffer[i].path[0].toString()}`;
      }
    }
  }
};