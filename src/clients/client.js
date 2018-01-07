require('dotenv').config();
'use strict';

let client = null;

module.exports.assign = (_client) => {
	client = _client;
};

module.exports.list = async(details) => {
	if(client !== null && client.list) {
		return client.list(details);
	} else {
		throw new Error('Your client has not function list()');
	}
};

module.exports.getTorrent = async(hash) => {
	if(client !== null && client.getTorrent) {
		return client.getTorrent(hash);
	} else {
		throw new Error('Your client has not function getTorrent(hash)');
	}
};

module.exports.pause = async(hash) => {
	if(client !== null && client.pause) {
		return client.pause(hash);
	} else {
		throw new Error('Your client has not function pause(hash)');
	}
};

module.exports.resume = async(hash) => {
	if(client !== null && client.resume) {
		return client.resume(hash);
	} else {
		throw new Error('Your client has not function resume(hash)');
	}
};

module.exports.delete = async(hash) => {
	if(client !== null && client.delete) {
		return client.delete(hash);
	} else {
		throw new Error('Your client has not function delete(hash)');
	}
};

module.exports.open = async(hash) => {
	if(client !== null && client.open) {
		return client.open(hash);
	} else {
		throw new Error('Your client has not function open(hash)');
	}
};