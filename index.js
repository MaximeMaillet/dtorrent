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


const serverWorker = require('./src/servers');
const manager = require('./src/manager');
const availableClients = ['rtorrent'];


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
	return manager();
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
  try {
    config = addConfig(config);

    const serverPID = staticPID++;
    const server = {
      pid: serverPID,
      client,
      config: config,
      server_name: config.name || `Server ${serverPID}`
    };
    module.exports.joinClient(server);
    servers.push(server);
    await serverWorker.start(server);

    return serverPID;
  } catch(e) {
    lError(`dTorrentException : ${e}`);
  }
};

/**
 * @param server
 */
module.exports.joinClient = (server) => {
  client.assign(server, server.config.clientScript);
};

/**
 * Add config
 * @param config
 */
function addConfig(config) {
	lDebug('Check configuration');

  if(!config) {
    config = {};
  }

	const defaultConfig = [
		{name: 'interval_check', default: 1500},
		{name: 'client', default: 'rtorrent'}
	];

	for(let i=0; i<defaultConfig.length; i++) {
		if(config[defaultConfig[i].name]) {
		  if(typeof config[defaultConfig[i].name] === 'string') {
        config[defaultConfig[i].name] = config[defaultConfig[i].name].toLowerCase();
      } else {
        config[defaultConfig[i].name] = config[defaultConfig[i].name];
		  }
		} else {
			config[defaultConfig[i].name] = defaultConfig[i].default;
		}
	}

	if(!config.client) {
	  throw new Error('[ConfigError] You should add client');
  }

  if(!config.host) {
    throw new Error('[ConfigError] You should add host');
  }

  if(!config.port) {
    throw new Error('[ConfigError] You should add port');
  }

  if(!config.endpoint) {
    throw new Error('[ConfigError] You should add endpoint');
  }

  if(availableClients.indexOf(config.client) !== -1) {
    config.clientScript = require(`./src/clients/${config.client}`);
  } else {
    throw new Error(`This client is not supported : ${config.client}`);
  }

	return config;
}