const debug = require('debug');
const nt = require('nt');
const {promisify} = require('util');
const fs = require('fs');

const lDebug = debug('dTorrent:api:controllers:debug');
let staticList = null;
'use strict';
/**
 * Initialize api
 * @param _staticList
 */
module.exports.init = (_staticList) => {
	lDebug('Initialize API controller');
	staticList = _staticList;
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
		return res.send((await staticList.getTorrent(req.params.hash)));
	} catch(e) {
		res.status(500).send(e);
	}
};

/**
 * Pause torrent
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
module.exports.pause = async(req, res) => {
	if(!req.params.hash) {
		return res.status(422).status('Hash is missing');
	}

	try {
		await staticList.pause(req.params.hash);
		return res.send({success: true});
	} catch(e) {
		res.status(500).send(e);
	}
};

/**
 * Resume torrent
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
module.exports.resume = async(req, res) => {
	if(!req.params.hash) {
		return res.status(422).status('Hash is missing');
	}

	try {
		await staticList.resume(req.params.hash);
		return res.send({success: true});
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
		return res.send((await staticList.getList()));
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

		if(req.files.torrent && req.files.file) {
			addTorrentAndFile(req.files.torrent[0], req.files.file[0])
				.then((hash) => {
					staticList.onEvent('torrent_added', {
						'hash': hash,
						'is_finished': true
					});
					res.send('Torrent is uploaded');
				})
				.catch((e) => {
					if(e.name === 'hash') {
						res.status(422).send('Hash check is not ok');
					} else {
						res.status(500).send(e.name);
					}
				});
		}
		else if(req.files.file && req.body.tracker) {
			createTorrentFromFile(req.files.file, req.body.tracker)
				.then(({torrent, file}) => {
					return checkTorrent(torrent, file);
				});
		} else if(req.files.torrent && req.body.token) {
			getTorrent(req.files.torrent[0].path)
			.then((torrent) => {
				return moveTorrent(req.files.torrent[0])
					.then(() => {
						return torrent;
					});
			})
			.then((torrent) => {
				staticList.onEvent('torrent_added', {
					'hash': torrent.hash,
					'is_finished': false
				});
				res.send('Torrent is added');
			});
		} else {
			res.status(404).send({'msg': 'Missing files'});
		}
	});
};

/**
 * Erase torrent
 * @param req
 * @param res
 * @return {Promise.<void>}
 */
module.exports.delete = async(req, res) => {
	if(!req.params.hash) {
		return res.status(422).status('Hash is missing');
	}

	try {
		await staticList.erase(req.params.hash);
		return res.send({success: true});
	} catch(e) {
		res.status(500).send(e);
	}
};

/**
 * @param torrentFile
 * @return {Promise.<TResult>|*}
 */
function getTorrent(torrentFile) {
	const _ntRead = promisify(nt.read);
	return _ntRead(torrentFile)
		.then((torrent) => {
			return torrent;
		});
}

/**
 * Check hash
 * @param torrentFile
 * @param file
 */
function checkTorrent(torrentFile, file) {
	const _ntRead = promisify(nt.read);
	return _ntRead(torrentFile)
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
	return move(torrent, `${process.env.STORAGE}/dtorrent/torrent/${torrent.originalname}`);
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

/**
 * Put torrent + file
 * @param torrent
 * @param file
 */
function addTorrentAndFile(torrent, file) {
	return checkTorrent(torrent.path, file)
		.then(({success, hash}) => {
			if(success) {
				moveFile(file)
					.then(() => {
						return moveTorrent(torrent);
					})
					.then(() => {
						return hash;
					})
				;
			} else {
				throw new Error('hash');
			}
		});
}

/**
 * Add file
 * @param file
 * @param tracker
 */
function addFile(file, tracker) {
	const torrent = createTorrentFromFile(file, tracker);
	return addTorrentAndFile(torrent, file);
}

function createTorrentFromFile(files, tracker) {
	return new Promise((resolve, reject) => {
		const names = files.map((file) => {
			return file.filename;
		});

		nt.makeWrite(`${files[0].originalname}.torrent`, tracker, files[0].destination,
			names,
			(err, torrent) => {
				if (err) reject(err);

				resolve({
					'torrent': torrent,
					'file': files
				});
			});
	});
}