var log = require('./logger'),
    crypto = require('crypto');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function (io, secrets) {
  return function (req, res) {
    log.info('Received PushEvent');

    var payload = req.body;
    if (!payload) {
      log.info('Rejecting PushEvent due to missing payload (400 Bad Request)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }

    var sigHead = req.headers['x-hub-signature'];
    if (!sigHead) {
      log.info('Rejecting PushEvent due to missing X-Hub-Signature header (400 Bad Request)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }

    log.info('X-Hub-Signature: %s', sigHead);
    
    var secretsArray = Object.keys(secrets);
    
    for (var i = 0; i < secretsArray.length; i++) {
      var secret = secretsArray[i];

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(req.rawBody).digest('hex');

      if (sigHead === "sha1=" + hash) {
        log.info('HMAC hash (%s) matches secret: %s', hash, secret);

        res.writeHead(200, textPlainHeaders);
        res.end();

        log.info('Forwarding PushEvent to clients (%d)', secrets[secret].length);
        io.to("secret=" + secret).emit('PushEvent', payload);
        return;
      }
    }

    log.info('Rejecting PushEvent due to no listening clients subscribed to secret (403 Forbidden)');
    res.writeHead(403, textPlainHeaders);
    res.end();
  }
};