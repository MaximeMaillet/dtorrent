require('dotenv').config();
const debug = require('debug');
const lDebug = debug('dTorrent:app:debug');
const lError = debug('dTorrent:app:error');

const {ListenerHandler} = require('./src/handlers/listener-handler');
const {TorrentHandler} = require('./src/handlers/torrent-handler');
const listenerHandler = new ListenerHandler();
const torrentHandler = new TorrentHandler(listenerHandler);

const servers = [];

const workerList = require('./src/workers/list');
const client = require('./src/clients/client');

let staticPID = 1;


module.exports.getServer = (pid) => {
  for(const i in servers) {
    if(servers[i].pid === pid) {
      return servers[i];
    }
  }

  return null;
};

/**
 * @return {Promise.<exports>}
 */
module.exports.manager = async() => {
	return require('./src/manager')(listenerHandler, torrentHandler, servers);
};

/**
 * Launch fake torrent listener
 * @param config
 * @return {Promise.<void>}
 */
module.exports.fake = async(config) => {
  for(const i in config) {
    config[i].client = require('./tests/client/fake');
  }
  await module.exports.start(config);
};

/**
 * Start server dTorrent
 * @param config
 * @return {Promise.<void>}
 */
module.exports.start = async(config) => {
  for(const i in config) {
    try {
      config[i] = addConfig(config[i]);

      const server = {
        pid: staticPID++,
        client,
        config: config[i],
      };

      module.exports.joinClient(server.pid, config[i].client);

      server.server_name = config[i].name || `Server ${server.pid}`;
      servers.push(server);

      lDebug(`Start servers ${server.server_name}`);
      await workerList.start(torrentHandler, Object.assign(config[i], {pid: server.pid}));
    } catch(e) {
      lError(`Exception app ${e}`);
    }
  }
};

/**
 * @param pid
 * @param _client
 */
module.exports.joinClient = (pid, _client) => {
  client.assign(pid, _client);
};

/**
 * Add config
 * @param config
 */
function addConfig(config) {
	lDebug('Check configuration');

	if(!config.root_path) {
    throw new Error('Config need root_path');
  }

  if(config.root_path.substr(-1) !== '/') {
    config.root_path += '/';
  }

	if(!config) {
		config = {};
	}

	const envs = [
		{name: 'rtorrent_host', default: '127.0.0.1'},
		{name: 'rtorrent_port', default: '8080'},
		{name: 'rtorrent_path', default: '/RPC2'},
    {name: 'dir_torrent', default: `${config.root_path}dtorrent/torrent/`},
    {name: 'dir_downloaded', default: `${config.root_path}dtorrent/downloaded/`},
    {name: 'dir_log', default: `${config.root_path}dtorrent/logs/`},
	];

	for(const i in envs) {
		if(config && config[envs[i].name]) {
			process.env[envs[i].name.toUpperCase()] = config[envs[i].name];
		} else if(!process.env[envs[i].name.toUpperCase()]) {
			process.env[envs[i].name.toUpperCase()] = envs[i].default;
		}
	}

	const configs = [
		{name: 'interval_check', default: 1500},
		{name: 'client', default: require('./src/clients/rTorrent')}
	];

	for(const i in configs) {
		if(config && config[configs[i].name]) {
			config[configs[i].name] = config[configs[i].name];
		} else {
			config[configs[i].name] = configs[i].default;
		}
	}

	return config;
}