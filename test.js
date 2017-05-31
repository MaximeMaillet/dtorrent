/**
 * Created by MaximeMaillet on 30/05/2017.
 */
var t = require('./listener');


t.start({
	torrent: {
		client: 'rTorrent',
		host: '192.168.1.101',
		port: 8080,
		path: '/RPC2'
	}
});