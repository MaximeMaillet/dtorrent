require('dotenv').config();
const clients = [];

function getClient(pid) {
  for(const i in clients) {
    if(clients[i].pid === pid) {
      return clients[i].client;
    }
  }
  return null;
}

module.exports.assign = (pid, client) => {
	clients.push({
    pid, client,
  });
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
    if (client.pause) {
      return client.pause(hash);
    } else {
      throw new Error('Your client has not function pause(hash)');
    }
  }
};

module.exports.resume = async(pid, hash) => {
  const client = getClient(pid);
  if(client) {
    if (client !== null && client.resume) {
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