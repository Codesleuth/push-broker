var crypto = require('crypto');

function ClientManager() {
  this.secrets = {};
}

ClientManager.prototype.add = function (socket, secret) {
  var bucket = this.secrets[secret] || {};
  var clients = bucket.clients || [];

  if (clients.indexOf(socket) === -1)
    clients.push(socket);

  bucket.clients = clients;
  this.secrets[secret] = bucket;
};

ClientManager.prototype.remove = function (socket) {
  var secrets = Object.keys(this.secrets);
  var found = false;

  for (var secretIndex in secrets) {
    var secret = secrets[secretIndex];
    var bucket = this.secrets[secret];
    var clientIndex = bucket.clients.indexOf(socket);

    if (clientIndex > -1) {
      bucket.clients.splice(clientIndex, 1);
      found = true;

      if (bucket.clients.length === 0)
        delete this.secrets[secret];
    }
  }

  return found;
};

ClientManager.prototype.findSecret = function (body, hash) {
  var secrets = Object.keys(this.secrets);

  for (var secretIndex in secrets) {
    var secret = secrets[secretIndex];
    var bucket = this.secrets[secret];

    var hmac = crypto.createHmac('sha1', secret);
    var thisHash = hmac.update(body).digest('hex');
    
    if (thisHash === hash)
      return secret;
  }

  return null;
};

ClientManager.prototype.countClients = function (secret) {
  var bucket = this.secrets[secret];
  if (!bucket)
    return NaN;
  return bucket.clients.length;
};

module.exports = function () {
  return new ClientManager();
};