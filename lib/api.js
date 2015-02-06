var http = require('http');
var socketio = require('socket.io');
var morgan = require('morgan');

function handler(req, res, io) {
  if (req.url != '/payload') {
    res.statusCode = 404;
    res.write('Not found');
    res.end();
    return;
  }

  if (req.method != 'POST') {
    res.statusCode = 405;
    res.write('Method not allowed');
    res.end();
    return;
  }

  var body = '';

  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', function () {
    console.log('got push body: ', body);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end();

    io.emit('payload', body);
  });

  req.on('error', function () {
    console.log('Something went horribly wrong.');
    res.statusCode = 500;
    res.end();
  });
}

module.exports = function () {
  var logger = morgan('combined');

  var app = http.createServer(function (req, res) {
    var done = handler(req, res, io);

    logger(req, res, function (err) {
      if (err) return done(err);
    });
  });
  var io = socketio(app);

  io.on('connection', function (socket) {
    console.log('connection event');
  });

  return app;
};