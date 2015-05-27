var express = require('express'),
    pinghandler = require('./pinghandler'),
    pushhandler = require('./pushhandler'),
    bodyParser = require('body-parser'),
    log = require('./logger');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

function pullRawBody(req, res, body, encoding) {
  req.rawBody = body;    
}

module.exports = function (io, clientmanager) {
  var router = express.Router();

  router.use(function (req, res, next) {
    req.__githubEvent = req.headers['x-github-event'];
    log.info('Received "%s" event', req.__githubEvent);
    next();
  });

  router.use(bodyParser.json({ verify: pullRawBody, limit: '250kb' }));
  router.use(function (error, req, res, next){
    res.writeHead(400, textPlainHeaders);
    res.end('Invalid JSON body');
  });

  router.use(function (req, res, next) {
    if (Object.keys(req.body).length == 0) {
      log.info('Rejecting %s due to missing payload (400 Bad Request)', req.__githubEvent);
      res.writeHead(400, textPlainHeaders);
      return res.end('Payload is missing');
    }

    var signatureHeader = req.headers['x-hub-signature'];
    if (!signatureHeader) {
      log.info('Rejecting %s due to missing X-Hub-Signature header (400 Bad Request)', req.__githubEvent);
      res.writeHead(400, textPlainHeaders);
      return res.end('A HMAC signature is required - specify a secrey key');
    }

    log.info('X-Hub-Signature: %s', signatureHeader);
    next();
  });

  var pinghandle = pinghandler(clientmanager);
  var pushhandle = pushhandler(io, clientmanager);

  router.post('/', function (req, res, next) {
    switch (req.__githubEvent) {
      case "ping": pinghandle(req, res); break;
      case "push": pushhandle(req, res); break;
      default: next(); break;
    }
  });

  router.use(function (req, res, next) {
    res.writeHead(400, textPlainHeaders);
    res.end('Unknown event');
  });

  return router;
};