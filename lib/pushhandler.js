var log = require('./logger'),
    crypto = require('crypto');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function (io) {
  return function (req, res) {
    log.info('Received PushEvent');

    var payload = req.body;

    if (!payload) {
      log.info('Rejecting PushEvent (400)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }

    var sigHead = req.headers['x-hub-signature'];
    log.info('X-Hub-Signature: %s', sigHead);

    if (sigHead) {
      log.info('Calculating HMAC hash...');
      var hmac = crypto.createHmac('sha1', 'test');
      var hash = hmac.update(req.rawBody).digest('hex');
      log.info('HMAC hash calculated: %s', hash);

      if (sigHead !== hash) {
        log.info('Rejecting PushEvent (403)');
        res.writeHead(403, textPlainHeaders);
        return res.end();
      }
    }
    
    res.writeHead(200, textPlainHeaders);
    res.end();

    log.info('Forwarding PushEvent to client');
    io.emit('PushEvent', payload);
  }
};