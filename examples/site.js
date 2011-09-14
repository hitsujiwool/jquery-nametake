$(function() {
  var manager = $('#pages').nametake({
    enablePreloader: false,
    lock: true
  });

  manager.on('initialize', function() {
    var $elem = $(this.currentScene.element);
    if ($elem.parent().hasClass('parent')) {
      $($elem.parent()).show();
    } else {
      $elem.children('ul').show();
    }
    $elem.show();
  });

  manager.of('/*', function(scene) {
    scene
      .start(function(next) {
        $(scene.element).children('ul').fadeOut();
        next();
      })
      .end(function(next) {
        $(scene.element).children('ul').fadeIn();
        next();
      })
      .to('/*', function(to, next) {
        $(scene.element).stop().fadeOut();
        $(to.element).stop().fadeIn(next);
      })
      .to('/*/*', function(to, next) {
        $(to.element).stop().fadeIn(next);
      });
  });

  manager.of('/*/*', function(scene) {
    scene
      .start(function(next) {
        $(scene.element).stop().fadeOut();
        next();
      })
      .to('/*', function(to, next) {
        next();
      })
      .to('/*/*', function(to, next) {
        $(to.element).stop().fadeIn(next);
      });
  });
});