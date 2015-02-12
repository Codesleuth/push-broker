var express = require('express'),
    socketio = require('socket.io'),
    http = require('http'),
    log = require('./logger'),
    eventrouter = require('./eventrouter');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

var secrets = {};

module.exports = function () {
  var app = express();
  app.use(log.middleware());

  var server = http.Server(app);
  var io = socketio(server);

  app.use('/webhook', eventrouter(io, secrets));

  app.use(function (req, res) {
    res.writeHead(404, textPlainHeaders);
    res.end();
  });

  function clientSecret(socket, secret, cb) {
    log.info('Socket.IO [%s] client subscribed to secret: %s', socket._clientid, secret);

    socket.__secret = secret;
    
    var socketArray = secrets[secret] || [];
    socketArray.push(socket);
    secrets[secret] = socketArray;

    socket.join("secret=" + secret);

    cb('acknowledged');
  }

  function clientDisconnected(socket) {

    var socketArray = secrets[secret];
    if (!socketArray)
      return;

    var index = socketArray.indexOf(socket.__secret);
    if (index == -1)
      return;

    socketArray.splice(index, 1);
    secrets[secret] = socketArray;

    log.info('Socket.IO [%s] client unsubscribed from secret: %s', socket._clientid, secret);
    log.info('Socket.IO [%s] client disconnected', this._clientid);
  }

  io.on('connection', function (socket) {
    var clientAddress = socket.request.connection._peername.address;
    var clientPort = socket.request.connection._peername.port;
    socket._clientid = clientAddress + ':' + clientPort;

    log.info('Socket.IO [%s] client connected', socket._clientid);

    socket.on('secret', clientSecret.bind(undefined, socket));
    socket.on('disconnect', clientDisconnected.bind(undefined, socket));
  });

  return server;
};