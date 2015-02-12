var express = require('express'),
    pinghandler = require('./pinghandler'),
    pushhandler = require('./pushhandler'),
    bodyParser = require('body-parser'),
    log = require('./logger');

function pullRawBody(req, res, body, encoding) {
  req.rawBody = body;    
}

module.exports = function (io, secrets) {
  var router = express.Router();

  router.use(function (req, res, next) {
    req.__githubEvent = req.headers['x-github-event'];
    next();
  });

  router.post('/', function (req, res, next) {
    if (req.__githubEvent === 'ping')
      pinghandler(io)(req, res);
    else
      next();
  });

  router.post('/', bodyParser.json({ verify: pullRawBody }), function (req, res, next) {
    if (req.__githubEvent === 'push')
      pushhandler(io, secrets)(req, res);
    else
      next();
  });

  router.use(function (req, res, next) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end();
  });

  return router;
};