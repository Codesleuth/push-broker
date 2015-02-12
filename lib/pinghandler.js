var log = require('./logger');

module.exports = function () {
  return function (req, res) {
    log.info('Received PingEvent');
    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end();
  }
};