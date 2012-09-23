$(function() {

  var manager = $.nametake('.pages', {
    changeHash: true,
    enablePreloader: true,
    lock: false,
    initialSceneId: '/1'
  });

  var $container = $('.container'),
      $navigation = $('.navigation'),
      $overlay = $('.overlay'),
      $bar = $('.bar');

  manager
    .on('preinitialize', function(preloader, next) {
      $('.first').each(function(i, elem) {
        var $elem = $(elem);
        $elem.css('left', i * $elem.width());
      });
      preloader.on('progress', function(n) {
        $bar.stop(true).animate({ width: $container.width() * n }, { easing: 'linear', duration: 100 });
      });
      preloader.on('complete', function() {
        $bar.stop(true).animate({ width: $container.width() }, next);
      });
    })
    .on('initialize', function(initialScene) {      
      $overlay.delay(500).fadeOut(function() {
        $overlay.remove();
      });
      manager.moveTo(initialScene);
    })
    .on('404', function() {
      alert('404');
    })  
    .on('transitionstart', function() {
      $navigation.stop(true).animate({ top: -40 });
    })
    .on('transitionend', function() {
      var tmp = (function(scene) {
        return scene.parent ? arguments.callee(scene.parent).concat([scene.id]) : [];
      })(this.currentScene);
      $navigation
        .empty()
        .append('<p>' + tmp.join('&nbsp;&nbsp;>&nbsp;&nbsp;') + '</p>')
        .animate({ top: 0 });
    })
    .of('/', function(scene) {
      scene
        .to('child', function(to, data) {
          $container
            .css('left', - to.index() * to.element.width());
        });
    })
    .of(/^\/[^/]+$/, function(scene) {
      scene
        .to('sibling', function(to, data, next) {
          $container.animate({ left: - to.index() * scene.element.width() }, next);
        })
        .to('child', function(to, data, next) {
          scene.element.animate({ top: - (to.index() + 1) * $container.height()}, next);
        });
    })
    .of(/^\/[^/]+\/[^/]$/, function(scene) {
      scene
        .to('parent', function(to, data, next) {
          to.element.animate({ top : 0 }, next);
        })
        .to('sibling', function(to, data, next) {
          to.parent.element.animate({ top: - (to.index() + 1) * $container.height() }, next);
        });
    });
});