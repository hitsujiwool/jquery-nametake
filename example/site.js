

if (!window.console) {
  window.console = {
    log: function() {}
  };
};

$(function() {
  $.nametake.debug = true;
  var nametake = $.nametake('.pages', {
    changeHash: false,
    enablePreloader: false,
    lock: true,
    initialSceneId: '/1'
  });

  var $container = $('.container');

  var log = (function() {
    var $p = $('.log');
    return function(msg) {
      $p.text(msg);
    };
  })();

  nametake
    .on('initialize', function() {
      var that = this; 
      $('.first').each(function(i, elem) {
        var $elem = $(elem);
        $elem.css('left', i * $elem.width());
      });
      $('.pages').fadeIn(function() {
        that.moveTo(that.initialScene);     
      });
    })
    .on('404', function() {
      console.log(404);
    })
    .of('/', function(scene) {
      scene
        .toChild(function(to, next) {
          $container.fadeIn(next);          
        });
    })
    .of(/^\/[^/]+$/, function(scene) {
      scene
        .toSibling(function(to, next) {
          $container.animate({'left': - to.index() * scene.element.width()}, next);
        })
        .toChild(function(to, next) {
          scene.element.animate({'top': - (to.index() + 1) * $container.height()}, next);
          //to.element.fadeIn(next);
        })
        .end(function(next) {
          next();
        });
    })
    .of(/^\/[^/]+\/[^/]$/, function(scene) {
      scene
        .toParent(function(to, next) {
          to.element.animate({top : 0}, next);
        })
        .toSibling(function(to, next) {
          to.parent.element.animate({top: - (to.index() + 1) * $container.height()}, next);
        });
    })
    .of('/1/2/1', function(scene) {
      scene
        .start(function(next) {
          next();
          scene.element.animate({top: - scene.element.height(), left: - scene.element.width()});
        })
        .end(function(next) {
          scene.element.animate({top: 0, left: 0}, next);
        });      
    })
    .of('/1/2/2', function(scene) {
      scene
        .start(function(next) {
          next();
          scene.element.animate({top: - scene.element.height(), left: scene.element.width()});
        })
        .end(function(next) {
          scene.element.animate({top: 0, left: 0}, next);
        });      
    });
});