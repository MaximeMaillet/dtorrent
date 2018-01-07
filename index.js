require('dotenv').config();
'use strict';

const debug = require('debug');
const workerList = require('./src/workers/list');
const torrentHandler = require('./src/handlers/torrent-handler');
const listenerHandler = require('./src/handlers/listener-handler');
const client = require('./src/clients/client');

const lDebug = debug('dTorrent:app:debug');
const lError = debug('dTorrent:app:error');

let pid = 0;

module.exports.joinClient = (_client) => {
	client.assign(_client);
};

/**
 * Start app
 * @param config
 * @return {Promise.<void>}
 */
module.exports.start = async(config, listener) => {

	try {
		pid++;
		config = addConfig(config);
		module.exports.joinClient(config.client);

		lDebug('Start app');
		await workerList.start({listenerHandler, torrentHandler}, config);
	} catch(e) {
		lError(`Exception app ${e}`);
	}
};

/**
 * @return {Promise.<exports>}
 */
module.exports.manager = async() => {
	return require('./src/manager')({listenerHandler, torrentHandler});
};

module.exports.fake = async() => {
	const fake = require('./tests/fake');
	fake.start(listenerHandler);
};

/**
 * Add config
 * @param config
 */
function addConfig(config) {
	lDebug('Check configuration');

	if(!config) {
		config = {};
	}

	const envs = [
		{name: 'rtorrent_host', default: '127.0.0.1'},
		{name: 'rtorrent_port', default: '8080'},
		{name: 'rtorrent_path', default: '/RPC2'}
	];
	for(const i in envs) {
		if(config && config[envs[i].name]) {
			process.env[envs[i].name.toUpperCase()] = config[envs[i].name];
		} else if(!process.env[envs[i].name.toUpperCase()]) {
			process.env[envs[i].name.toUpperCase()] = envs[i].default;
		}
	}

	const configs = [
		{name: 'interval_check', default: 1500},
		{name: 'client', default: require('./src/clients/rTorrent')}
	];

	for(const i in configs) {
		if(config && config[configs[i].name]) {
			config[configs[i].name] = config[configs[i].name];
		} else {
			config[configs[i].name] = configs[i].default;
		}
	}

	return config;
}