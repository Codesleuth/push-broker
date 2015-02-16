var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../lib/api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    random = require('./random'),
    crypto = require('crypto');

function UUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function UAID() {
  return 'xxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

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
    var pushEventData;

    before(function (done) {
      expectedPayload = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));

      request.post({
        url: urlFull,
        body: expectedPayload,
        headers: {
          'User-Agent': 'GitHub-Hookshot/044aadd',
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': UUID()
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
    var expectedDeliveryId;
    var expectedUserAgent;

    var response;
    var pushEventData;

    before(function (done) {
      expectedPayload = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));
      expectedDeliveryId = UUID();
      expectedUserAgent = 'GitHub-Hookshot/' + UAID();

      var secret = random.string();

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(expectedPayload).digest('hex');

      socket = sioClient(urlBase, { forceNew: true });

      var events = 2;
      
      socket.on('PushEvent', function (data) {
        pushEventData = data;

        if (!--events) done();
      });

      socket.on('connect', function () {
        socket.emit('secret', secret, function () {
          request.post({
            url: urlFull,
            body: expectedPayload,
            headers: {
              'User-Agent': expectedUserAgent,
              'Content-Type': 'application/json',
              'X-Github-Event': 'push',
              'X-Github-Delivery': expectedDeliveryId,
              'X-Hub-Signature': 'sha1=' + hash
            }
          }, function (err, res, body) {
            response = err || res;

            if (!--events) done();
          });
        });
      });

    });

    it('should respond with 200 OK', function () {
      assert.strictEqual(response.statusCode, 200);
    });

    it('should receive the payload with the expected delivery id header', function () {
      assert.strictEqual(pushEventData.headers['X-Github-Delivery'], expectedDeliveryId);
    });

    it('should receive the payload with the expected user agent header', function () {
      assert.strictEqual(pushEventData.headers['User-Agent'], expectedUserAgent);
    });

    it('should receive the payload with the expected payload body', function () {
      assert.deepEqual(pushEventData.body, JSON.parse(expectedPayload));
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
          'User-Agent': 'GitHub-Hookshot/044aadd',
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
          'User-Agent': 'GitHub-Hookshot/044aadd',
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