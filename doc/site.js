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
      $elem.children('.content:first').show();
    }
    $elem.show();
  });

  manager.of('/*', function(scene) {
    scene
      .start(function(next) {
        $(scene.element).children('.content:first').fadeOut();
        next();
      })
      .end(function(next) {
        $(scene.element).children('.content:first').fadeIn();
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