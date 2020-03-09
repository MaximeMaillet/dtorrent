require('dotenv').config();

const xmlrpc = require('xmlrpc');
const _path = require('path');
let client = null;

module.exports.init = (credentials) => {
	if(!client) {
		client = xmlrpc.createClient({
			host: credentials.host,
			port: credentials.port,
			path: credentials.endpoint,
			encoding: 'UTF-8'
		});
	}
};

/**
 * @param method
 * @param params
 * @return {Promise}
 */
function methodCall(method, params) {
	return new Promise((resolve, reject) => {
		client.methodCall(method, params, (error, result) => {
			if(error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
}

module.exports.list = async(details) => {
	if(!details) {
		return methodCall('download_list', []);
	}

	const hashList = await methodCall('download_list', []);
	const arrayReturn = [];
	for(let i=0; i<hashList.length; i++) {
		arrayReturn.push(await this.getTorrent(hashList[i]));
	}
	return arrayReturn;
};

module.exports.getTorrent = async(hash) => {
	/** Check data already downloaded */
	const completedByte = await methodCall('d.completed_bytes', [hash]);

	/** Total size of torrent */
	const sizeBytes = await methodCall('d.size_bytes', [hash]);

	/** Check rate downloaded (speed download) */
	const downRate = await methodCall('d.down.rate', [hash]);

	/** Check size uploaded */
	const upTotal = await methodCall('d.up.total', [hash]);

	/** Check if torrent is playing or not */
	const isActive = await methodCall('d.is_active', [hash]);

	/** Get name */
	const name = await methodCall('d.name', [hash]);

	/** Get ration up/down */
	const ratio = await methodCall('d.ratio', [hash]);

	const nbSeeders = await methodCall('d.peers_complete', [hash]);
	const nbLeechers = await methodCall('d.peers_accounted', [hash]);

	/** torrent file name */
	const path = _path.basename((await methodCall('d.loaded_file', [hash])));

  return {
    hash: hash,
    name: name,
    active: isActive === '1',
    downloaded: Number(completedByte),
    uploaded: Number(upTotal),
    length: Number(sizeBytes),
    path: path,
    extra: {
        ratio: ratio/1000,
        down_rate: Number(downRate),
        nb_seeders: Number(nbSeeders),
        nb_leechers: Number(nbLeechers),
    },
  };
};

module.exports.addCustom = async(hash, data) => {
  return methodCall('d.set_custom1', [hash, data]);
};

module.exports.pause = async(hash) => {
	return methodCall('d.pause', [hash]);
};

module.exports.resume = async(hash) => {
	return methodCall('d.resume', [hash]);
};

module.exports.remove = async(hash) => {
	return methodCall('d.erase', [hash]);
};

module.exports.open = async(hash) => {
	return methodCall('d.open', [hash]);
};