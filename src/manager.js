'use strict';

const debug = require('debug');
const parseTorrent = require('parse-torrent');
const nt = require('nt');
const {promisify} = require('util');
const fs = require('fs');
const Torrent = require('./models/torrent');

const lDebug = debug('dTorrent:manager:debug');
let listenerHandler, torrentHandler = null;

/**
 * Init manager
 * @param _staticList
 */
module.exports = ({listenerHandler: _listenerHandler, torrentHandler: _torrentHandler}) => {
	lDebug('Initialize manager');
	listenerHandler = _listenerHandler;
	torrentHandler = _torrentHandler;
	return module.exports;
};

module.exports.addListener = (callback) => {
	listenerHandler.add(callback);
};

module.exports.removeListener = (callback) => {
	listenerHandler.remove(callback);
};

module.exports.addWebHook = (url, callback) => {
	listenerHandler.addWebhook(url, callback);
};

module.exports.removeWebhHook = (url) => {
	listenerHandler.removeWebhook(url);
};
/**
 * Get all torrent
 * @return {Promise.<*>}
 */
module.exports.getAll = async() => {
	try {
		return (await torrentHandler.getList());
	} catch(e) {
		throw e;
	}
};

/**
 * Get one torrent from hash
 * @param hash
 * @return {Promise.<*>}
 */
module.exports.getOne = async(hash) => {
	if(!hash) {
		throw new Error('Hash is missing');
	}

	try {
		const torrent = new Torrent(hash);
		return (await torrentHandler.getTorrent(torrent).toString());
	} catch(e) {
		throw e;
	}
};

/**
 * Pause torrent
 * @param hash
 * @return {Promise.<boolean>}
 */
module.exports.pause = async(hash) => {
	if(!hash) {
		throw new Error('Hash is missing');
	}

	try {
		const torrent = new Torrent(hash);
		return (await torrentHandler.pause(torrent)).toString();
	} catch(e) {
		throw e;
	}
};

/**
 * Resume torrent
 * @param hash
 * @return {Promise.<boolean>}
 */
module.exports.resume = async(hash) => {
	if(!hash) {
		throw new Error('Hash is missing');
	}

	try {
		const torrent = new Torrent(hash);
		return (await torrentHandler.resume(torrent)).toString();
	} catch(e) {
		throw e;
	}
};

/**
 * Delete torrent
 * @param hash
 * @return {Promise.<boolean>}
 */
module.exports.delete = async(hash) => {
	if(!hash) {
		throw new Error('Hash is missing');
	}

	try {
		const torrent = new Torrent(hash);
		return (await torrentHandler.delete(torrent)).toString();
	} catch(e) {
		throw e;
	}
};

/**
 * Extract data from torrent file
 * @param torrentFile
 * @return {Object}
 */
module.exports.extractTorrentFile = (torrentFile) => {
	return getDataTorrentFromFile(torrentFile);
};

/**
 * Create torrent from torrent file (for upload)
 * @return {Promise.<*>}
 * @param torrentFile
 */
module.exports.createFromTorrent = async(torrentFile) => {
	try {
		const _torrent = getDataTorrentFromFile(torrentFile);
		const torrent = new Torrent(_torrent.infoHash);

		if(!torrentHandler.isExist(torrent)) {
			await move(_torrent.info.destination, `${process.env.STORAGE}/dtorrent/torrent/${_torrent.name}.torrent`);

			return {
				success: true,
				torrent: torrent.toString()
			};
		} else {
			return {
				success: false,
				name: 'AlreadyExists',
				message: 'Torrent already exists',
				torrent: torrent.toString()
			};
		}
	} catch(e) {
		throw {
			error: e,
			torrentFile: torrentFile
		};
	}
};
/**
 * Add torrent file + data file
 * @param torrentFile
 * @param dataFile
 * @return {Promise.<*>}
 */
module.exports.createFromTorrentAndData = async(torrentFile, dataFile) => {

	const success = await checkTorrentIntegrity(torrentFile, dataFile);

	if(success) {
		try {
			const _torrent = getDataTorrentFromFile(torrentFile);
			const torrent = new Torrent(_torrent.infoHash);

			if(!torrentHandler.isExist(torrent)) {
				await move(dataFile, `${process.env.STORAGE}/dtorrent/downloaded/${_torrent.name}`);
				await move(torrentFile, `${process.env.STORAGE}/dtorrent/torrent/${_torrent.name}.torrent`);

				return {
					success: true,
					torrent: torrent.toString()
				};
			} else {
				return {
					success: false,
					name: 'AlreadyExists',
					message: 'Torrent already exists',
					torrent: torrent.toString()
				};
			}
		} catch(e) {
			throw {
				error: e,
				torrentFile: torrentFile
			};
		}
	} else {
		throw new Error('files failed');
	}
};


/**
 * TODO : To test
 * @param dataFiles
 * @param tracker
 * @param torrentName
 * @return {Promise.<void>}
 */
module.exports.createFromDataAndTracker = async(dataFiles, tracker, torrentName) => {

	if(dataFiles.length === 0) {
		throw new Error('You should upload at least one file');
	}

	const names = dataFiles.map((file) => {
		return file.name;
	});

	if(!torrentName) {
		torrentName = dataFiles[0].name;
	}

	nt.makeWrite(
		`${torrentName}.torrent`,
		tracker,
		dataFiles.destination,
		names,
		(err, torrent) => {
			if (err) {
				throw err;
			}

			return torrent;
		}
	);
};



/**
 * Check integrity between torrent and data
 * @param torrentFile
 * @param file
 * @return {Promise.<TResult>|*}
 */
function checkTorrentIntegrity(torrentFile, file) {
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
 * Move file
 * @param file
 * @param targetDirectory
 * @return {Promise.<void>}
 */
async function move(file, targetDirectory) {
	const unLink = promisify(fs.unlink);
	const inputStream = fs.createReadStream(file);
	const outputStream = fs.createWriteStream(targetDirectory);

	inputStream.pipe(outputStream);
	inputStream.on('end', (err) => {
			if(err) {
				throw err;
			} else {
				unLink(file);
				return true;
			}
		});
}

/**
 * Read torrent content then return result
 * @param torrentFile
 * @return {Object}
 */
function getDataTorrentFromFile(torrentFile) {
	const torrent = parseTorrent(fs.readFileSync(torrentFile));
	let l = 0;
	for(const j in torrent.info.files) {
		l += torrent.info.files[j].length;
	}
	torrent.info.total_size = l;
	torrent.info.destination = torrentFile;
	torrent.infoHash = torrent.infoHash.toUpperCase();
	return torrent;
}