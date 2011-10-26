$(function() {
  $.nametake.debug = true;
  var nametake = $.nametake('.pages', {
    changeHash: false,
    enablePreloader: false,
    lock: true,
    initialSceneId: '/1'
  });

  var $container = $('.container');
  var $navigation = $('.navigation');

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
    })  
    .on('transitionstart', function() {
      $navigation.animate({top: -40});
    })
    .on('transitionend', function() {
      var tmp = (function(scene) { return scene.parent ? arguments.callee(scene.parent).concat([scene.id]) : []; })(this.currentScene);
      $navigation
        .empty()
        .append('<p>' + tmp.join('&nbsp;&nbsp;>&nbsp;&nbsp;') + '</p>')
        .animate({top: 0});
    })
    .of('/', function(scene) {
      scene
        .toChild(function(to, next) {
          $container
            .css('left', - to.index() * to.element.width())
            .fadeIn(next);          
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
          scene.element.animate({left: '-=' + scene.element.width()}, next);
        })
        .end(function(next) {
          scene.element.animate({left: '+=' + scene.element.width()}, next);
        });      
    })
    .of('/1/2/2', function(scene) {
      scene
        .start(function(next) {
          scene.element.animate({right: '-=' + scene.element.width()}, next);
        })
        .end(function(next) {
          scene.element.animate({right: '+=' + scene.element.width()}, next);
        });      
    });
});