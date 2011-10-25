

if (!window.console) {
  window.console = {
    log: function() {}
  };
};

$(function() {
  var nametake = $.nametake('.pages', {
    changeHash: true,
    enablePreloader: false,
    lock: true,
    initialSceneId: '/1'
  });

  var log = (function() {
    var $p = $('.log');
    return function(msg) {
      $p.text(msg);
    };
  })();

  nametake.on('initialize', function() {
    console.log('initialize');
    this.moveTo(this.initialScene);
  });

  nametake.on('404', function() {
    console.log(404);
  });
  
  nametake.on('transitionend', function() {
    console.log('transitionend');
  });

  nametake.on('transitionstart', function() {
    console.log('transitionstart');
  });
  
  nametake.of(/.+/, function(scene) {
    scene
      .start(function(next) {
        console.log('Start ' + scene.id);
        next();      
      })
      .end(function(next) {
        log(scene.id);
        console.log('End ' + scene.id);
        next();
      })
      .toParent(function(to, next) {
        console.log('To ' + to.id + '. Parent of ' + scene.id + '.');
        next();          
      })
      .toChild(function(to, next) {
        console.log('To ' + to.id + '. Child of ' + scene.id + '.');
        next();  
      })
      .toSibling(function(to, next) {
        console.log('To ' + to.id + '. Sibling of ' + scene.id + '.');
        next();  
      });
  });
});