var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

describe('Push Event forwarding', function () {

  var server;
  var socket;
  var expectedPayload;

  var connected;
  var response;
  var actualPayload;

  before(function (done) {
    var urlBase = 'http://127.0.0.1:3000';
    var urlPath = '/payload';
    expectedPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json')));

    server = api();
    server.listen(process.env.PORT || 3000, function () {
      socket = sioClient(urlBase);

      var payloadReceived, responseReceived;
      
      socket.on('payload', function (data) {
        actualPayload = data;
        payloadReceived = true;

        if (responseReceived)
          done();
      });

      socket.on('connect', function (socket) {
        connected = true;

        request.post({
          url: url.resolve(urlBase, urlPath),
          body: expectedPayload,
          json: true,
          headers: {
            'X-Github-Event': 'push',
            'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
          }
        }, function (err, res, body) {
          response = !err && res.statusCode == 200;
          responseReceived = true;

          if (payloadReceived)
            done();
        });
      });
    });

  });

  it('should connect', function () {
    assert.ok(connected);
  });

  it('should respond with 200 OK', function () {
    assert.ok(response);
  });

  it('should receive the payload from the connected socket', function () {
    assert.deepEqual(actualPayload, expectedPayload);
  });

  after(function () {
    socket.disconnect();
  });

});