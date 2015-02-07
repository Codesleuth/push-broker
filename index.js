var express = require('express'),
    socketio = require('socket.io'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    http = require('http'),
    log = require('./logger');

function handler(io, req, res) {
  var payload = req.body.payload;
  
  log.info('Received push payload: ', payload);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end();

  io.emit('payload', payload);
}

var app = express();
app.use(log.middleware());

var urlEncodedParser = bodyParser.urlencoded({ extended: true, parameterLimit: 1 });

var server = http.Server(app);
var io = socketio(server);

app.post('/payload', urlEncodedParser, handler.bind(app, io));
app.use(function (req, res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end();
});

io.on('connection', function (socket) {
  var clientAddress = socket.request.connection._peername.address;
  var clientPort = socket.request.connection._peername.port;
  log.info('Socket.IO connection received from %s:%d', clientAddress, clientPort);
});

var port = process.env.PORT || 3000;
var ip = process.env.IP || null;

server.listen(port, ip, function () {
  log.info('Server ready at %s:%d', ip || '0.0.0.0', port);
});