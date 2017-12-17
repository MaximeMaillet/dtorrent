require('dotenv').config();

const xmlrpc = require('xmlrpc');

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
	const completedByte = await methodCall('d.get_completed_bytes', [hash]);

	/** Total size of torrent */
	const sizeBytes = await methodCall('d.get_size_bytes', [hash]);

	/** Check rate downloaded (speed download) */
	const downRate = await methodCall('d.get_down_rate', [hash]);

	/** Check size uploaded */
	const upTotal = await methodCall('d.get_up_total', [hash]);

	/** Check if torrent is playing or not */
	const isActive = await methodCall('d.is_active', [hash]);

	/** Get name */
	const name = await methodCall('d.get_name', [hash]);

	/** Get ration up/down */
	const ratio = await methodCall('d.get_ratio', [hash]);

	const nbSeeders = await methodCall('d.get_peers_complete', [hash]);
	const nbLeechers = await methodCall('d.get_peers_accounted', [hash]);

	return {
		hash: hash,
		name: name,
		progress: Math.round((completedByte*100) / sizeBytes),
		down_rate: Number(downRate),
		mb_downloaded: Number(completedByte),
		mb_uploaded: Number(upTotal),
		mb_total: Number(sizeBytes),
		is_active: isActive === '1',
		ratio: ratio/1000,
		nb_seeders: Number(nbSeeders),
		nb_leechers: Number(nbLeechers)
	};
};

/**
 * @return {*}
 */
function getClient() {
	return xmlrpc.createClient({
		host: process.env.RTORRENT_HOST || '127.0.0.1',
		port: process.env.RTORRENT_PORT || 8080,
		path: process.env.RTORRENT_PATH || '/RPC2',
		encoding: 'UTF-8'
	});
}

/**
 * @param method
 * @param params
 * @return {Promise}
 */
function methodCall(method, params) {
	return new Promise((resolve, reject) => {
		getClient().methodCall(method, params, (error, result) => {
			if(error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
}