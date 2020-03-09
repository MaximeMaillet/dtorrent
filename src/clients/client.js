require('dotenv').config();
const servers = [];

function getServer(pid) {
  for(const i in servers) {
    if(servers[i].pid === pid) {
      return servers[i];
    }
  }
  return null;
}

module.exports.assign = (server, client) => {
  servers.push({
    ...server,
    client,
  });
};

module.exports.init = async(pid) => {
  const server = getServer(pid);
  if(server && server.client) {
    if(server.client.init) {
      server.client.init({
        name: server.config.name,
        host: server.config.host,
        port: server.config.port,
        endpoint: server.config.endpoint,
      });
    } else {
      throw new Error('Your client has not function list()');
    }
  }
};

module.exports.list = async(pid, details) => {
  const server = getServer(pid);
  if(server && server.client) {
    if(server.client.list) {
      return server.client.list(details);
    } else {
      throw new Error('Your client has not function list()');
    }
  }
};

module.exports.getTorrent = async(pid, hash) => {
  const server = getServer(pid);
  if(server && server.client) {
    if(server.client.getTorrent) {
      return server.client.getTorrent(hash);
    } else {
      throw new Error('Your client has not function getTorrent(hash)');
    }
  }
};

module.exports.pause = async(pid, hash) => {
  const server = getServer(pid);
  if(server && server.client) {
    if (server.client.pause) {
      return server.client.pause(hash);
    } else {
      throw new Error('Your client has not function pause(hash)');
    }
  }
};

module.exports.resume = async(pid, hash) => {
  const server = getServer(pid);
  if(server && server.client) {
    if (server.client.resume) {
      return server.client.resume(hash);
    } else {
      throw new Error('Your client has not function resume(hash)');
    }
  }
};

module.exports.remove = async(pid, hash) => {
  const server = getServer(pid);
  if(server && server.client) {
    if (server.client.remove) {
      return server.client.remove(hash);
    } else {
      throw new Error('Your client has not function remove(hash)');
    }
  }
};

module.exports.open = async(pid, hash) => {
  const server = getServer(pid);
  if(server && server.client) {
    if (server.client.open) {
      return server.client.open(hash);
    } else {
      throw new Error('Your client has not function open(hash)');
    }
  }
};

module.exports.addCustom = async(pid, hash, data) => {
  const server = getServer(pid);
  if(server && server.client) {
    if (server.client.addCustom) {
      return server.client.addCustom(hash, data);
    } else {
      throw new Error('Your client has not function addCustom(hash)');
    }
  }
};