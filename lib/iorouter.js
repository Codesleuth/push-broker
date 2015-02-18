var socketio = require('socket.io'),
    log = require('./logger');

function clientSecret(clientmanager, secret, cb) {
  log.info('Socket.IO [%s] client subscribed to secret: %s', this._clientid, secret);

  clientmanager.add(this, secret);
  this.join("secret=" + secret);
  cb('acknowledged');
}

function clientDisconnected(clientmanager) {
  clientmanager.remove(this);
  log.info('Socket.IO [%s] client disconnected', this._clientid);
}

function clientConnected(clientmanager, socket) {
  var clientAddress = socket.request.connection._peername.address;
  var clientPort = socket.request.connection._peername.port;
  socket._clientid = clientAddress + ':' + clientPort;

  log.info('Socket.IO [%s] client connected', socket._clientid);

  socket.on('secret', clientSecret.bind(socket, clientmanager));
  socket.on('disconnect', clientDisconnected.bind(socket, clientmanager));
}

module.exports = function (server, clientmanager) {
  var io = socketio(server);

  io.on('connection', clientConnected.bind(io, clientmanager));

  return io;
};