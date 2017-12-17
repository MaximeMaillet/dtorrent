require('dotenv').config();

const debug = require('debug');
const mongoose = require('mongoose');
const amqp = require('amqplib/callback_api');
const TorrentList = require('./src/models/torrent-list');

const launchApi = require('./src/api');
const launchListener = require('./src/listener');
const {promisify} = require('util');

const lDebug = debug('dTorrent:app:debug');
const lError = debug('dTorrent:app:error');

/**
 * Add config
 * @param config
 */
module.exports.addConfig = (config) => {
	if(config.rtorrent_host) {
		process.env.RTORRENT_HOST = config.rtorrent_host;
	}

	if(config.rtorrent_port) {
		process.env.RTORRENT_PORT = config.rtorrent_port;
	}

	if(config.rtorrent_path) {
		process.env.RTORRENT_PATH = config.rtorrent_path;
	}

	if(config.mongo_host) {
		process.env.MONGO_HOST = config.mongo_host;
	}

	if(config.mongo_port) {
		process.env.MONGO_PORT = config.mongo_port;
	}

	if(config.rabbit_mq_host) {
		process.env.RABBIT_MQ_HOST = config.rabbit_mq_host;
	}

	if(config.rabbit_mq_port) {
		process.env.RABBIT_MQ_PORT = config.rabbit_mq_port;
	}

	if(config.rabbit_mq_nodename) {
		process.env.RABBIT_MQ_NODENAME = config.rabbit_mq_nodename;
	}
};

/**
 * Start app
 * @param listener
 * @return {Promise.<void>}
 */
module.exports.start = async(listener) => {

	try {
		lDebug('Check connections');
		await checkConnection();

		const staticTorrentList = new TorrentList();
		staticTorrentList.addListener(listener);

		lDebug('Launch API');
		launchApi(staticTorrentList);

		lDebug('Launch listener');
		launchListener.start(staticTorrentList);

	} catch(e) {
		lError(`Exception app ${e}`);
	}
};

/**
 * Check connection with external tools
 * @return {Promise.<void>}
 */
async function checkConnection() {
	try {
		await initializeMongodb();
		lDebug('Connections MongoDB OK');

		await initilizeRabbitMq();
		lDebug('Connections RabbitMQ OK');
	} catch(e) {
		lError(`Exception connections ${e}`);
	}
}

/**
 * Init mongo connection
 * @return {Promise}
 */
async function initializeMongodb() {
	return new Promise((resolve, reject) => {
		mongoose.connect(
			`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/torrent`,
			{
				useMongoClient: true
			},
			(err) => {
				if(err) {
					reject(err);
				} else {
					mongoose.Promise = require('bluebird');
					resolve(true);
				}
			}
		);
	});

}

/**
 * Init RabbitMQ
 * @return {Promise.<*>}
 */
async function initilizeRabbitMq() {
	const url_rabbit = `amqp://${process.env.RABBIT_MQ_USER}:${process.env.RABBIT_MQ_PASSWORD}@${process.env.RABBIT_MQ_HOST}:${process.env.RABBIT_MQ_PORT}`;
	const amqpConnect = promisify(amqp.connect);
	return amqpConnect(url_rabbit);
}