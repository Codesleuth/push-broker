var express = require('express'),
    socketio = require('socket.io'),
    http = require('http'),
    log = require('./logger'),
    eventrouter = require('./eventrouter');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function () {

  var app = express();
  app.use(log.middleware());

  var server = http.Server(app);
  var io = socketio(server);

  app.use('/webhook', eventrouter(io, server));

  app.use(function (req, res) {
    res.writeHead(404, textPlainHeaders);
    res.end();
  });

  function clientDisconnected() {
    log.info('Socket.IO [%s] client disconnected', this._clientid);
  }

  io.on('connection', function (socket) {
    var clientAddress = socket.request.connection._peername.address;
    var clientPort = socket.request.connection._peername.port;
    socket._clientid = clientAddress + ':' + clientPort;

    log.info('Socket.IO [%s] client connected', socket._clientid);

    socket.on('disconnect', clientDisconnected);
  });

  return server;
};