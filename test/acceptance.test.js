var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../lib/api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    random = require('./random'),
    crypto = require('crypto');

describe('Acceptance Tests', function () {

  var urlBase;
  var urlPath;
  var urlFull;
  var server;

  before(function (done) {
    urlBase = 'http://127.0.0.1:3000';
    urlPath = '/webhook';
    urlFull = url.resolve(urlBase, urlPath);

    server = api();
    server.listen(process.env.PORT || 3000, done);
  });

  after(function (done) {
    server.close(done);
  });

  describe('PushEvent with missing HMAC signature', function () {

    var socket;
    var expectedPayload;

    var response;
    var actualPayload;

    before(function (done) {
      expectedPayload = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));

      request.post({
        url: urlFull,
        body: expectedPayload,
        headers: {
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
        }
      }, function (err, res, body) {
        response = err || res.statusCode;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response, 400);
    });

  });

  describe('PushEvent with HMAC Signature', function () {

    var socket;
    var expectedPayload;

    var response;
    var actualPayload;

    before(function (done) {
      expectedPayload = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));
      var secret = random.string();

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(expectedPayload).digest('hex');

      console.log('sha1=%s', hash);

      socket = sioClient(urlBase, { forceNew: true });

      var payloadReceived, responseReceived;
      
      socket.on('PushEvent', function (data) {
        actualPayload = data;
        payloadReceived = true;

        if (responseReceived)
          done();
      });

      socket.on('connect', function () {
        socket.emit('secret', secret, function () {
          request.post({
            url: urlFull,
            body: expectedPayload,
            headers: {
              'Content-Type': 'application/json',
              'X-Github-Event': 'push',
              'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
              'X-Hub-Signature': 'sha1=' + hash
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
      assert.deepEqual(actualPayload, JSON.parse(expectedPayload));
    });

    after(function () {
      socket.disconnect();
    });

  });

  describe('PushEvent with incorrect HMAC Signature', function () {

    var expectedPayload;
    var response;

    before(function (done) {
      expectedPayload = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));
      
      request.post({
        url: urlFull,
        body: expectedPayload,
        headers: {
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
          'X-Hub-Signature': 'sha1=invalid'
        }
      }, function (err, res, body) {
        response = err || res.statusCode;
        done();
      });

    });

    it('should respond with 403 Forbidden', function () {
      assert.strictEqual(response, 403);
    });

  });

  describe('UnknownEvent', function () {

    var response;

    before(function (done) {
      request.post({
        url: urlFull,
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

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response, 400);
    });

  });

});