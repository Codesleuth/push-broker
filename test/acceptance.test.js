var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../lib/api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

describe('PushEvent', function () {

  var server;
  var socket;
  var expectedPayload;

  var response;
  var actualPayload;

  before(function (done) {
    var urlBase = 'http://127.0.0.1:3000';
    var urlPath = '/webhook';
    expectedPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json')));

    server = api();
    server.listen(process.env.PORT || 3000, function () {
      socket = sioClient(urlBase);

      var payloadReceived, responseReceived;
      
      socket.on('PushEvent', function (data) {
        actualPayload = data;
        payloadReceived = true;

        if (responseReceived)
          done();
      });

      socket.on('connect', function (socket) {
        request.post({
          url: url.resolve(urlBase, urlPath),
          body: expectedPayload,
          json: true,
          headers: {
            'X-Github-Event': 'push',
            'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
          }
        }, function (err, res, body) {
          response = err || res.statusCode;
          responseReceived = true;

          if (payloadReceived)
            done();
        });
      });
    });

  });

  it('should respond with 200 OK', function () {
    assert.strictEqual(response, 200);
  });

  it('should receive the payload from the connected socket', function () {
    assert.deepEqual(actualPayload, expectedPayload);
  });

  after(function (done) {
    socket.disconnect();
    server.close(done);
  });

});

describe('UnknownEvent', function () {

  var server;
  var response;

  before(function (done) {
    var urlBase = 'http://127.0.0.1:3000';
    var urlPath = '/webhook';

    server = api();
    server.listen(process.env.PORT || 3000, function () {
      request.post({
        url: url.resolve(urlBase, urlPath),
        body: { some: 'payload' },
        json: true,
        headers: {
          'X-Github-Event': 'unknown',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
        }
      }, function (err, res, body) {
        response = err || res.statusCode;
        done();
      });
    });

  });

  it('should respond with 400 Bad Request', function () {
    assert.strictEqual(response, 400);
  });

  after(function (done) {
    server.close(done);
  });

});