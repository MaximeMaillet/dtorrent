const debug = require('debug');
const amqp = require('amqplib/callback_api');
const {promisify} = require('util');

const lReceiver = debug('server.queue:receiver');
const lSender = debug('dtorrent.queue:sender');
const url_rabbit = `amqp://${process.env.RABBIT_MQ_USER}:${process.env.RABBIT_MQ_PASSWORD}@${process.env.RABBIT_MQ_HOST}:${process.env.RABBIT_MQ_PORT}`;
const amqpConnect = promisify(amqp.connect);

global.QUEUE_KEY = {
	USER: 'DragNTorrent.user',
	TORRENTS: 'DragNTorrent.torrent.*',
	SPECIFIC_USER: 'DragNTorrent.user.',
	SPECIFIC_TORRENT: 'DragNTorrent.torrent.'
};

const EXCHANGE = 'DragNTorrent';

const openQueues = [];

/**
 * Receive message from queue
 * @param key
 * @param listener
 */
module.exports.openQueue = async(key, listener) => {
	try {
		const connection = await amqpConnect(url_rabbit);
		connection.createChannel((error, channel) => {
			if(error) {
				return listener.onError({code: 500, message: error});
			}

			lReceiver(`Open queue on ${key}`);

			channel.assertExchange(EXCHANGE, 'topic', {durable: true});
			channel.assertQueue('', {exclusive: true}, (err, q) => {

				if(err) {
					listener.onError({code: 500, message: err});
				}

				channel.bindQueue(q.queue, EXCHANGE, key);
				channel.consume(q.queue, (msg) => {
					try {
						lReceiver('Queue :: Received From %s', key);
						listener.onEmit(JSON.parse(msg.content.toString()));
					} catch(e) {
						lReceiver('Error parsing %s', e);
					}

				}, {noAck: true});
			});

			channel.on('close', () => {
				lReceiver('Queue :: disconnect from %s', key);
			});

			openQueues.push(channel);
		});

	} catch(e) {
		return listener.onError({code: 500, message: e});
	}
};

/**
 * @TODO
 * Close channel
 */
module.exports.close = function() {
	// éviter de tout pêter et fermer juste celle de l'user (quand il aura un token)
	for(let i=0; i<openQueues.length; i++) {
		try {
			openQueues[i].close();
		}
		catch (alreadyClosed) {
			console.log(alreadyClosed.stackAtStateChange);
		}
	}
};

/**
 * Send message to queue
 * @param key
 * @param strMsg
 */
module.exports.send = async(key, strMsg) => {
	try {
		const connection = await amqpConnect(url_rabbit);
		connection.createChannel((err, ch) => {

			if(err) {
				lSender('Fail to send message : %s', err);
				return;
			}

			ch.assertExchange(EXCHANGE, 'topic', {durable: true});
			ch.publish(EXCHANGE, key, new Buffer(strMsg));
			lSender('Sent to %s', key);
		});

	} catch(e) {
		lSender(`Fail to send message : ${e}`);
	}
};