require('dotenv').config();
const debug = require('debug');
const lDebug = debug('dTorrent:app:debug');
const lError = debug('dTorrent:app:error');
const client = require('./src/clients/client');
const serverWorker = require('./src/servers');
const manager = require('./src/manager');
const availableClients = ['rtorrent'];
let staticPID = 1;
const servers = [];

/**
 * @return {Promise.<exports>}
 */
module.exports.manager = (serverName) => {
  const server = servers.filter((srv) => srv.server_name === serverName)[0];
  if(!server) {
    // throw new Error(`This server does not exists - ${serverName}`);
    return {
      addListener: manager.addListener,
      removeListener: manager.removeListener,
      extractTorrentFile: manager.extractTorrentFile,
    };
  }

	return {
	  ...manager,
    resume: (hash) => manager.resume(server.pid, hash),
    pause: (hash) => manager.pause(server.pid, hash),
    remove: (hash) => manager.remove(server.pid, hash),
  };
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
      server_name: config.name || `Server ${serverPID}`,
      client: config.clientScript,
      config,
    };
    servers.push(server);
    client.create(server);
    await serverWorker.start(server);

    return serverPID;
  } catch(e) {
    lError(`dTorrentException : ${e}`);
  }
};

/**
 * @param pid
 * @returns {*}
 */
module.exports.getServer = (pid) => {
  for(let i=0; i<servers.length; i++) {
    if(servers[i].pid === pid) {
      return servers[i];
    }
  }

  lError('getServer : This PID does not exists');
  throw new Error('This PID does not exists');
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