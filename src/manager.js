'use strict';

const debug = require('debug');
const nt = require('nt');
const {promisify} = require('util');
const fs = require('fs');

const lDebug = debug('dTorrent:api:controllers:debug');
let staticList = null;

/**
 * Init manager
 * @param _staticList
 */
module.exports = (_staticList) => {
	lDebug('Initialize manager');
	staticList = _staticList;
	return module.exports;
};

module.exports.addListener = (callback) => {
	staticList.addListener(callback);
};

module.exports.removeListener = (callback) => {
	staticList.removeListener(callback);
};

/**
 * Get all torrent
 * @return {Promise.<*>}
 */
module.exports.getAll = async() => {
	try {
		return (await staticList.getList());
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
		return (await staticList.getTorrent(hash));
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
		await staticList.pause(hash);
		return true;
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
		await staticList.resume(hash);
		return true;
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
		await staticList.erase(hash);
		return true;
	} catch(e) {
		throw e;
	}
};

/**
 * Create torrent from torrent file (for upload)
 * @param torrentFile
 * @return {Promise.<*>}
 */
module.exports.createFromTorrent = async(torrentFile) => {
	const torrent = await getDataTorrentFromFile(torrentFile);
	try {
		await move(torrentFile, `${process.env.STORAGE}/dtorrent/torrent/`);

		staticList.onEvent('torrent_added', {
			'hash': torrent.hash,
			'is_finished': true
		});

		return torrent;
	} catch(e) {
		throw e;
	}
};

/**
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

			staticList.onEvent('torrent_added', {
				'hash': torrent.hash,
				'is_finished': true
			});

			return torrent;
		}
	);
};

/**
 * Add torrent file + data file
 * @param torrentFile
 * @param dataFile
 * @return {Promise.<void>}
 */
module.exports.createFromTorrentAndData = async(torrentFile, dataFile) => {

	const torrent = await getDataTorrentFromFile(torrentFile);
	const {success, hash} = await checkTorrentIntegrity(torrentFile, dataFile);

	if(success) {
		try {
			await move(dataFile, `${process.env.STORAGE}/downloaded/${torrent.name}`);
			await move(torrentFile, `${process.env.STORAGE}/dtorrent/torrent/${torrent.name}`);

			staticList.onEvent('torrent_added', {
				'hash': hash,
				'is_finished': true
			});

			return torrent;
		} catch(e) {
			throw e;
		}
	}
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
	const inputStream = fs.createReadStream(file.path);
	const outputStream = fs.createWriteStream(targetDirectory);

	inputStream.pipe(outputStream);
	inputStream.on('end', (err) => {
			if(err) {
				throw err;
			} else {
				unLink(file.path);
				return true;
			}
		});
}

/**
 * Read torrent content then return result
 * @param torrentFile
 * @return {Promise.<*>}
 */
async function getDataTorrentFromFile(torrentFile) {
	const _ntRead = promisify(nt.read);
	return _ntRead(torrentFile);
}