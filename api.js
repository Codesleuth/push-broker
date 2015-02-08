var express = require('express'),
    socketio = require('socket.io'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    http = require('http'),
    log = require('./logger');

function handler(io, req, res) {
  var payload = req.body;

  if (!payload) {
    log.info('Rejecting push payload from /payload');
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end();
  }
  
  log.info('Received push payload from /payload');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end();

  log.info('Forwarding push payload to client');
  io.emit('payload', payload);
}

module.exports = function () {

  var app = express();
  app.use(log.middleware());

  var jsonParser = bodyParser.json();

  var server = http.Server(app);
  var io = socketio(server);

  app.post('/payload', jsonParser, handler.bind(app, io));
  app.use(function (req, res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end();
  });

  io.on('connection', function (socket) {
    var clientAddress = socket.request.connection._peername.address;
    var clientPort = socket.request.connection._peername.port;
    log.info('Socket.IO connection received from %s:%d', clientAddress, clientPort);
  });

  return server;
};