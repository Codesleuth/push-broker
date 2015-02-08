var log = require('./logger'),
    api = require('./api');

var server = api();

var port = process.env.PORT || 3000;
var ip = process.env.IP || null;

server.listen(port, ip, function () {
  log.info('Server ready at %s:%d', ip || '0.0.0.0', port);
});