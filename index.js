(function (window, $) {

  var logPatch = function () {
    console.log(arguments);
  };

  var log = {
    info: logPatch,
    error: logPatch
  };

  var defaultUrl = 'http://push-broker.herokuapp.com';
  var nextUrl = defaultUrl;
  var socket;

  function connectSocket(url, pushHandler, disconnected) {
    var socket = io(url, { multiplex: true });

    socket.on('connect', function () {
      log.info('Socket.IO connected.');
      $('#service-uri').val(socket.io.uri);
      log.info(socket);
    });

    socket.on('PushEvent', function (data) {
      log.info('PushEvent received: ', data.headers['X-Github-Delivery']);
      pushHandler(data);
    });

    socket.on('disconnect', function () {
      log.info('Socket.IO disconnected.');
    });

    socket.on('reconnecting', function () {
      log.info('Socket.IO reconnecting...');
    });

    socket.on('reconnect', function () {
      log.info('Socket.IO reconnected.');
    });

    return socket;
  }

  function setSecret(secret) {
    socket.emit('secret', secret, function (data) {
      log.info('Secret has been set.  ');
    });
  }

  $(function () {

    function pushHandler(data) {
      var eventDiv = $('.event-template').clone();
      eventDiv.attr('id', data.body.head_commit.id)
              .removeClass('event-template');

      var now = new Date();
      $('.event-id', eventDiv).text(data.headers['X-Github-Delivery']);
      $('.timeago', eventDiv).attr('datetime', now.toISOString()).text(now.toLocaleTimeString()).timeago();

      $('.payload', eventDiv).text(JSON.stringify(data.body, null, 2));
      $('.header-user-agent', eventDiv).text(data.headers['User-Agent']);
      $('.header-delivery', eventDiv).text(data.headers['X-Github-Delivery']);
      $('.header-sig', eventDiv).text(data.headers['X-Hub-Signature']);

      $('#events').prepend(eventDiv);

      $('.timeago', eventDiv).timeago();
    }

    socket = connectSocket(nextUrl, pushHandler);

    $('#set-secret').click(function (event) {
      event.preventDefault();
      setSecret($('#secret').val());
    });

  });

})(window, jQuery);