'use strict';

const debug = require('debug');
const parseTorrent = require('parse-torrent');
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
 * Get content of torrent
 * @param torrentFile
 * @return {Object}
 */
module.exports.getTorrentContent = (torrentFile) => {
	return getDataTorrentFromFile(torrentFile);
};

/**
 * Create torrent from torrent file (for upload)
 * @return {Promise.<*>}
 * @param torrent
 */
module.exports.createFromTorrent = async(torrent) => {
	try {
		if(!(await module.exports.isExists(torrent))) {
			await move(torrent.info.destination, `${process.env.STORAGE}/dtorrent/torrent/${torrent.name}.torrent`);

			await staticList.onEvent('torrent_added', {
				'hash': torrent.infoHash,
				'is_finished': false
			});

			return {torrent, success: true};
		}

		return {torrent, success: false, message: 'exists'};
	} catch(e) {
		if(e.message === 'waiting') {
			return {torrent, success: false, message: 'waiting'};
		} else {
			throw {error: e, torrentFile: torrent.name};
		}
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
				'hash': torrent.infoHash(),
				'is_finished': true
			});

			return torrent;
		}
	);
};

/**
 * Add torrent file + data file
 * @param torrent
 * @param dataFile
 * @return {Promise.<*>}
 */
module.exports.createFromTorrentAndData = async(torrent, dataFile) => {

	const {success, hash} = await checkTorrentIntegrity(torrent.info.destination, dataFile);

	if(success) {
		try {
			if(!(await module.exports.isExists(torrent))) {
				await move(dataFile.path, `${process.env.STORAGE}/dtorrent/downloaded/${torrent.name}`);
				await move(torrent.info.destination, `${process.env.STORAGE}/dtorrent/torrent/${torrent.name}.torrent`);

				await staticList.onEvent('torrent_added', {
					'hash': torrent.infoHash,
					'is_finished': true,
					'progress': 100,
				});

				return {torrent: Object.assign(torrent, {is_finished: true, progress: 100}), success: true};
			} else {
				return {torrent: Object.assign(torrent, {is_finished: true, progress: 100}), success: false, message: 'exists'};
			}
		} catch(e) {
			if(e.message === 'waiting') {
				return {torrent, success: false, message: 'waiting'};
			} else {
				throw {error: e, torrentFile: torrent.name};
			}
		}
	} else {
		throw new Error('files failed');
	}
};

/**
 * Check if torrent already exists
 * @param torrent
 * @return {Promise.<boolean>}
 */
module.exports.isExists = async(torrent) => {
	return !!(await staticList.getFromDb(torrent.infoHash));
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