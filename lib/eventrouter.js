var express = require('express'),
    pushhandler = require('./pushhandler'),
    bodyParser = require('body-parser'),
    log = require('./logger');

module.exports = function (io) {
  var router = express.Router();

  router.use(function (req, res, next) {
    if (req.headers['x-github-event'] != 'push') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end();
    }
    next();
  });

  var jsonParser = bodyParser.json();
  router.post('/', jsonParser, pushhandler(io));

  return router;
};