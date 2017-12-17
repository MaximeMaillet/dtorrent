
const TorrentList = require('../../models/torrent-list');
const debug = require('debug');
const nt = require('nt');
const {promisify} = require('util');
const fs = require('fs');
const queue = require('../../lib/queue');

const staticTorrentList = new TorrentList();
const lDebug = debug('dTorrent:api:controller:debug');

/**
 * Initialize api
 * @param listener
 */
module.exports.init = (listener) => {
	lDebug('Initialize API controller');
	staticTorrentList.addListener(listener);
};

/**
 * Web socket
 * @param req
 * @param res
 */
module.exports.listener = (req, res) => {

	lDebug('Open connection');

	req.socket.setTimeout(120000);
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	});
	res.write('\n');

	const refreshIntervalId = setInterval(() => {
		lDebug('Send ping to client');
		res.write(`data: ${JSON.stringify({'event': 'ping'})} \n\n`);
	}, 90000);

	/**
	 * @TODO
	 * Check de connexion
	 */

	/**
	 * Listener rabbitMQ
	 */
	queue.openQueue(global.QUEUE_KEY.TORRENTS, {
		onError: function(error) {
			lDebug(error);
			res.write(`data: ${ JSON.stringify({event: 'disconnect'}) } \n\n`);
			res.end();
		},
		onEmit: function(jsonMsg) {
			res.write(`data: ${ JSON.stringify(jsonMsg) } \n\n`);
		}
	});

	req.on('close', () => {
		lDebug('Connection close');

		queue.close();

		clearInterval(refreshIntervalId);
		res.write(`data: ${ JSON.stringify({event: 'disconnect'}) } \n\n`);
		res.end();
	});

};


/**
 * @TODO
 * @param req
 * @param res
 * @param cpUpload
 * @return {Promise.<void>}
 */
module.exports.put = async(req, res, cpUpload) => {

};

/**
 * Get One
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
module.exports.getOne = async(req, res) => {
	if(!req.params.hash) {
		return res.status(422).status('Hash is missing');
	}

	try {
		return res.send((await staticTorrentList.getTorrent(req.params.hash)));
	} catch(e) {
		res.status(500).send(e);
	}
};

/**
 * Get all
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
module.exports.getAll = async(req, res) => {
	try {
		return res.send((await staticTorrentList.getList()));
	} catch(e) {
		res.status(500).send(e);
	}
};

/**
 * Post torrent
 * @param req
 * @param res
 * @param cpUpload
 */
module.exports.post = (req, res, cpUpload) => {
	cpUpload(req, res, (err) => {
		if (err) {
			return res.status(500).send(err);
		}

		checkTorrent(req.files.torrent[0], req.files.file[0])
			.then(({success, hash}) => {
				if(success) {
					moveFile(req.files.file[0])
						.then(() => {
							return moveTorrent(req.files.torrent[0]);
						})
						.then(() => {
							staticTorrentList.onEvent('torrent_added', {
								'hash': hash,
								'is_filled': false,
								'is_finished': true
							});
						})
					;
					res.send('Torrent is uploaded');
				} else {
					res.status(422).send('Hash check is not ok');
				}
			});
	});
};


module.exports.delete = (req, res) => {};


/**
 * Check hash
 * @param torrentFile
 * @param file
 */
function checkTorrent(torrentFile, file) {
	const ntRead = promisify(nt.read);
	return ntRead(torrentFile.path)
		.then((torrent) => {
			return new Promise((resolve, reject) => {
				torrent.metadata.info.name = file.filename;

				const hasher = torrent.hashCheck(file.destination);
				let percentMatch = 0;

				hasher.on('match', (i, hash, percent) => {
					percentMatch = percent;
				});

				hasher.on('end', () => {
					resolve({
						'success': percentMatch === 100,
						'hash': torrent.infoHash()
					});
				});
			});
		});
}

/**
 * Move torrent file
 * @param torrent
 */
function moveTorrent(torrent) {
	return move(torrent, `${process.env.STORAGE}/torrent/${torrent.originalname}`);
}

/**
 * Move file downloaded
 * @param file
 */
function moveFile(file) {
	return move(file, `${process.env.STORAGE}/downloaded/${file.originalname}`);
}

/**
 * Move generic file
 * @param file
 * @param targetDirectory
 * @return {Promise}
 */
function move(file, targetDirectory) {
	const unLink = promisify(fs.unlink);
	return new Promise((resolve, reject) => {

		const inputStream = fs.createReadStream(file.path);
		const outputStream = fs.createWriteStream(targetDirectory);

		inputStream.pipe(outputStream);
		inputStream.on('end', (err) => {

			if(err) {
				reject(err);
			} else {
				unLink(file.path);
				resolve();
			}
		});
	});
}