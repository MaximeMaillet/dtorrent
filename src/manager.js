const debug = require('debug');
const nt = require('nt');
const {promisify} = require('util');
const fs = require('fs');
const path = require('path');
const createTorrent = require('create-torrent');
const Torrent = require('./models/torrent');
const {getDataTorrentFromFile} = require('./utils/torrent');

const lDebug = debug('dTorrent:manager:debug');
let listenerHandler, torrentHandler, servers = null;

/**
 * Init manager
 * @param _listenerHandler
 * @param _torrentHandler
 * @param _servers
 */
module.exports = (_listenerHandler, _torrentHandler, _servers) => {
    lDebug('Initialize manager');
    listenerHandler = _listenerHandler;
    torrentHandler = _torrentHandler;
    servers = _servers;

    return module.exports;
  }
;

module.exports.addListener = (callback) => {
	listenerHandler.addListener(callback);
};

module.exports.removeListener = (callback) => {
	listenerHandler.removeListener(callback);
};

module.exports.addWebHook = (url, callback) => {
	listenerHandler.addWebHook(url, callback);
};

module.exports.removeWebhHook = (url) => {
	listenerHandler.removeWebhHook(url);
};

/**
 * Get all torrent
 * @return {Promise.<*>}
 */
module.exports.getAll = async(server) => {
  const pid = getPidFromServer(server);
	return torrentHandler.getAll(pid);
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

	return torrentHandler.getTorrentFromHash(hash);
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
		return (await torrentHandler.pause(hash)).toString();
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
		return (await torrentHandler.resume(hash)).toString();
	} catch(e) {
		throw e;
	}
};

/**
 * Delete torrent
 * @param hash
 * @return {Promise.<boolean>}
 */
module.exports.remove = async(hash) => {
	if(!hash) {
		throw new Error('Hash is missing');
	}

	try {
		return (await torrentHandler.remove(hash)).toString();
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
 * @param server
 */
module.exports.createFromTorrent = async(torrentFile, server) => {
  const pid = getPidFromServer(server);

	try {
		const _torrent = getDataTorrentFromFile(torrentFile);

		if(!torrentHandler.isHashExists(_torrent.infoHash)) {
			const isMoving = await move(_torrent.info.destination, `${process.env.DIR_TORRENT}${_torrent.name}.torrent`);

			if(isMoving) {
        const torrent = new Torrent(_torrent.infoHash);
        torrent.merge(_torrent);
        torrent.addPid(pid);

        return {
          success: true,
          torrent: torrent.toString()
        };
      }
      else {
        return {
          success: false,
          error: 'Cannot moving torrent file',
        };
      }
		}
		else {
      const torrent = torrentHandler.getTorrentFromHash(_torrent.infoHash);
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
 * @param server
 * @return {Promise.<*>}
 */
module.exports.createFromTorrentAndData = async(torrentFile, dataFile, server) => {
  const pid = getPidFromServer(server);
  let success = null;
  try {
    success = await checkTorrentIntegrity(torrentFile, dataFile);
  } catch(e) {
    throw {
      message: 'Integrity torrent failed',
      errors: e,
    };
  }

	if(success) {
		try {
			const _torrent = getDataTorrentFromFile(torrentFile);
			const torrent = new Torrent(_torrent.infoHash);
			torrent.addPid(pid);

			if(!torrentHandler.isExist(torrent)) {
				await move(dataFile, `${process.env.DIR_DOWNLOADED}${_torrent.name}`);
				await move(torrentFile, `${process.env.DIR_TORRENT}${_torrent.name}.torrent`);

				torrent.name = _torrent.name;
				torrent.finished = true;
				torrent.progress = 100;

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
 * @param server
 * @return {Promise.<void>}
 */
module.exports.createFromDataAndTracker = async(dataFiles, tracker, torrentName, server) => {
  const pid = getPidFromServer(server);

	if(dataFiles.length === 0) {
		throw new Error('You should upload at least one file');
	}

	if(dataFiles.length > 1) {
		throw new Error('You cant add more than one file, for the moment.');
	}

	const names = dataFiles.map((file) => {
		return file.filename;
	});

	if(!torrentName) {
		torrentName = dataFiles[0].originalname;
	}

	let torrent = null;

	return new Promise((resolve, reject) => {
		createTorrent(dataFiles[0].path, {
			name: torrentName,
			announceList: [tracker]
	}, (err, _torrent) => {
			if(err) {
				reject(err);
			} else {
				fs.writeFileSync(`${process.env.DIR_TORRENT}${torrentName}.torrent`, _torrent);
				const t = module.exports.extractTorrentFile(`${process.env.DIR_TORRENT}${torrentName}.torrent`);
				torrent = new Torrent(t.infoHash);
				torrent.addPid(pid);
				torrent.name = t.name;
				torrent.finished = true;
				torrent.progress = 100;
				torrent.size = t.info.length;
				torrent.downloaded = t.info.length;
				resolve(torrent);
			}
		});
	})
		.then(() => {
			return move(dataFiles[0].path, `${process.env.DIR_DOWNLOADED}${torrentName}`);
		})
		.then(() => {
			return {
				success: true,
				torrent: torrent.toString(),
			};
		})
		.catch((e) => {
			// TODO move roll back
			throw e;
		});
};

/**
 * Check integrity between torrent and data
 * @param torrentFile
 * @param dataFile
 * @return {Promise.<TResult>|*}
 */
async function checkTorrentIntegrity(torrentFile, dataFile) {
	const _ntRead = promisify(nt.read);
	return _ntRead(torrentFile)
    .then((torrent) => {
      return new Promise((resolve, reject) => {
        torrent.metadata.info.name = path.basename(dataFile);
        const hasher = torrent.hashCheck(path.dirname(dataFile));

        let percentMatch = 0;
        const errors = [];

        hasher.on('match', (i, hash, percent) => {
          percentMatch = percent;
        });

        hasher.on('error', (err) => {
          errors.push(err.message);
        });

        hasher.on('end', () => {
          if(errors.length > 0) {
            reject(errors);
          } else {
            resolve({
              'success': percentMatch === 100,
              'hash': torrent.infoHash()
            });
          }
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
function move(file, targetDirectory) {
  return new Promise((resolve, reject) => {
    const unLink = promisify(fs.unlink);
    const inputStream = fs.createReadStream(file);
    const outputStream = fs.createWriteStream(targetDirectory);

    inputStream.pipe(outputStream);
    inputStream.on('end', (err) => {
      if(err) {
        reject(err);
      } else {
        unLink(file);
        resolve(true);
      }
    });
  });
}

/**
 * @param server
 * @return {null}
 */
function getPidFromServer(server) {
  if(typeof server === 'string') {
    for(const i in servers) {
      if(servers[i].server_name === server) {
        return servers[i].pid;
      }
    }
  } else {
    for(const i in servers) {
      if(servers[i] === server) {
        return servers[i].pid;
      }
    }
  }

  console.log(servers);

  throw new Error(`This server does not exists ${server}`);
}