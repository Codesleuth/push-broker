var express = require('express'),
    pinghandler = require('./pinghandler'),
    pushhandler = require('./pushhandler'),
    bodyParser = require('body-parser'),
    log = require('./logger');

var textPlainHeaders = { 'Content-Type': 'text/plain' };
var jsonBodyParser = bodyParser.json({ verify: pullRawBody, limit: '600kb' });

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

  router.use(jsonBodyParser);

  router.use(function (req, res, next) {
    if (Object.keys(req.body).length == 0) {
      log.info('Rejecting %s due to missing payload (400 Bad Request)', req.__githubEvent);
      return res.status(400).send('Payload is missing');
    }

    var signatureHeader = req.headers['x-hub-signature'];
    if (!signatureHeader) {
      log.info('Rejecting %s due to missing X-Hub-Signature header (400 Bad Request)', req.__githubEvent);
      return res.status(400).send('A HMAC signature is required - specify a secrey key');
    }

    log.info('X-Hub-Signature: %s', signatureHeader);
    next();
  });

  var pinghandle = pinghandler(clientmanager);
  var pushhandle = pushhandler(io, clientmanager);

  router.post('/', function (req, res) {
    switch (req.__githubEvent) {
      case "ping": pinghandle(req, res); break;
      case "push": pushhandle(req, res); break;
      default: res.status(400).send('Unknown event'); break;
    }
  });

  router.use(function (error, req, res, next) {
    if (error.message === 'invalid json') {
      res.status(400).send('Invalid JSON body');
    } else {
      next(error);
    }
  });

  return router;
};