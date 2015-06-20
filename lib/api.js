var express = require('express'),
    iorouter = require('./iorouter'),
    http = require('http'),
    log = require('./logger'),
    eventrouter = require('./eventrouter'),
    clientmanager = require('./clientmanager');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function () {
  var manager = clientmanager();
  var app = express();
  app.use(log.middleware());

  var server = http.Server(app);
  var io = iorouter(server, manager);

  app.get('/', function (req, res) {
    res.status(302).location('https://codesleuth.github.io/push-broker').send();
  });

  app.use('/webhook', eventrouter(io, manager));

  app.use(function (req, res, next) {
    res.status(404).send('Not Found');
  });

  app.use(function (error, req, res, next) {
    log.error(error);
    res.status(500).send('Internal Server Error');
  });

  return server;
};