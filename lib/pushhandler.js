var log = require('./logger'),
    crypto = require('crypto');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function (io, secrets) {
  return function (req, res) {
    log.info('Received PushEvent');

    if (!req.body) {
      log.info('Rejecting PushEvent due to missing payload (400 Bad Request)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }

    var signatureHeader = req.headers['x-hub-signature'];
    if (!signatureHeader) {
      log.info('Rejecting PushEvent due to missing X-Hub-Signature header (400 Bad Request)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }

    log.info('X-Hub-Signature: %s', signatureHeader);

    var payload = {
      headers: {
        'User-Agent': req.headers['user-agent'],
        'X-Github-Delivery': req.headers['x-github-delivery'],
        'X-Hub-Signature': signatureHeader
      },
      body: req.body
    };
    
    var secretsArray = Object.keys(secrets);

    for (var i = 0; i < secretsArray.length; i++) {
      var secret = secretsArray[i];

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(req.rawBody).digest('hex');

      if (signatureHeader !== "sha1=" + hash) {
        log.debug('HMAC %s not matched for secret %s', hash, secret);
        continue;
      }

      log.info('HMAC hash (%s) matches secret: %s', hash, secret);

      res.writeHead(200, textPlainHeaders);
      res.end();

      log.info('Forwarding PushEvent to clients (%d)', secrets[secret].length);
      io.to("secret=" + secret).emit('PushEvent', payload);
      return;
    }

    log.info('Rejecting PushEvent due to no listening clients subscribed to secret (403 Forbidden)');
    res.writeHead(403, textPlainHeaders);
    res.end();
  }
};