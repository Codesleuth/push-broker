var log = require('./logger');

var textPlainHeaders = { 'Content-Type': 'text/plain' };

module.exports = function (io) {
  return function (req, res) {
    var payload = req.body;

    if (!payload) {
      log.info('Rejecting PushEvent (400)');
      res.writeHead(400, textPlainHeaders);
      return res.end();
    }
    
    log.info('Received PushEvent');
    res.writeHead(200, textPlainHeaders);
    res.end();

    log.info('Forwarding PushEvent to client');
    io.emit('PushEvent', payload);
  }
};