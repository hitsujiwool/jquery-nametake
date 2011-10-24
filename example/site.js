$(function() {
  var nametake = $.nametake('.pages', {
    changeHash: false,
    enablePreloader: false,
    lock: true
  });

  nametake.on('initialize', function() {
    this.moveTo('/1');
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

  nametake.of(/^\/[0-9]+$/, function(scene) {
    console.log(scene.id);
    scene
      .toChild(function(to, next) {
        console.log(to.element);
        to.element.fadeIn(next);
      });
  });
});
