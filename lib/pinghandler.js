var log = require('./logger');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function (clientmanager) {
  return function (req, res) {
    var signatureHeader = req.headers['x-hub-signature'];
    log.info('X-Hub-Signature: %s', signatureHeader);
    
    var hash = signatureHeader.substr(5);
    var secret = clientmanager.findSecret(req.rawBody, hash);

    if (secret === null) {
      log.info('Rejecting PingEvent due to no listening clients subscribed to secret (403 Forbidden)');
      res.writeHead(403, textPlainHeaders);
      res.end('Unable to find any listening clients for the specified signature');
      return;
    }

    log.info('HMAC hash (%s) matches secret: %s', hash, secret);
    res.writeHead(200, textPlainHeaders);
    res.end();
  }
};