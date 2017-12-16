require('dotenv').config();

const xmlrpc = require('xmlrpc');

module.exports.list = async() => {
	return methodCall('download_list', []);
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
	const isActive = await methodCall('d.is_active', [hash])

	/** Get name */
	const name = await methodCall('d.get_name', [hash]);

	/** Get ration up/down */
	const ratio = await methodCall('d.get_ratio', [hash]);

	return {
		hash: hash,
		name: name,
		progress: Math.round((completedByte*100) / sizeBytes),
		down_rate: downRate,
		mb_downloaded: Math.round(completedByte/(1024*1024)*100)/100,
		mb_uploaded: Math.round(upTotal/(1024*1024)*100)/100,
		mb_total: Math.round(sizeBytes/(1024*1024)*100)/100,
		playing: isActive === '1',
		isDone: completedByte === sizeBytes,
		ratio: ratio/100
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