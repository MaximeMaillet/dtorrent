require('dotenv').config();
const clients = [];

/**
 * @param pid
 */
function getClient(pid) {
  for(const i in clients) {
    if(clients[i].pid === pid) {
      return clients[i].client;
    }
  }

  throw new Error(`This PID does not exists : ${pid}`);
}

/**
 * @param pid
 */
function getClientData(pid) {
  for(const i in clients) {
    if(clients[i].pid === pid) {
      return clients[i];
    }
  }

  throw new Error(`This PID does not exists : ${pid}`);
}

/**
 * @param client
 */
module.exports.create = (client) => {
  clients.push(client);
};

/**
 * @param pid
 * @returns {Promise<void>}
 */
module.exports.init = async(pid) => {
  const client = getClientData(pid);
  if(client.client && client.client.init) {
    client.client.init({
      name: client.config.name,
      host: client.config.host,
      port: client.config.port,
      endpoint: client.config.endpoint,
    });
  } else {
    throw new Error('Your client has not function list()');
  }
};

module.exports.list = async(pid, details) => {
  const client = getClient(pid);
  if(client) {
    if(client.list) {
      return client.list(details);
    } else {
      throw new Error('Your client has not function list()');
    }
  }
};

module.exports.getTorrent = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if(client.getTorrent) {
      return client.getTorrent(hash);
    } else {
      throw new Error('Your client has not function getTorrent(hash)');
    }
  }
};

module.exports.pause = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if(client.pause) {
      return client.pause(hash);
    } else {
      throw new Error('Your client has not function pause(hash)');
    }
  }
};

module.exports.resume = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if (client.resume) {
      return client.resume(hash);
    } else {
      throw new Error('Your client has not function resume(hash)');
    }
  }
};

module.exports.remove = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if (client.remove) {
      return client.remove(hash);
    } else {
      throw new Error('Your client has not function remove(hash)');
    }
  }
};

module.exports.open = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if (client.open) {
      return client.open(hash);
    } else {
      throw new Error('Your client has not function open(hash)');
    }
  }
};

module.exports.addCustom = async(pid, hash, data) => {
  const client = getClient(pid);
  if(client) {
    if (client.addCustom) {
      return client.addCustom(hash, data);
    } else {
      throw new Error('Your client has not function addCustom(hash)');
    }
  }
};