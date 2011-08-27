$(function() {

  var manager = $('#wrapper').nametake({changeHash: false, changeTitle: false});
  var lastScene = {};


  manager.on('initialize', function() {

  });

  manager.of('*', function(scene) {
    scene.to('*', function(to, next) {
      $(to.parent.element).find('.container').stop().animate({
      left: - to.parent.indexOf(to) * 800
      }, 500, next);
    });
  });

  manager.on('transitionstart', function(from) {
    console.log('transitionstart');
  });

  manager.on('transitionend', function(to) {
    console.log('transitionend');
    lastScene[to.parent.id] = to;
  });

  $('#navigation a').bind('click', function(e) {
  });

  $('.prev').bind('click', function(e) {
    var id = '/' + $(this).parents('section')[0].id
      , last = lastScene[id];
    if (last) {
      if (last.hasNext()) {
        manager.moveTo(last.next().id);
      }
    } else {
      manager.moveTo(id + '/child4');
    }
  });

  $('.next').bind('click', function(e) {
    var id = '/' + $(this).parents('section')[0].id
      , last = lastScene['/' + $(this).parents('section')[0].id];
    if (last) {
      if (last.hasPrev()) {
        manager.moveTo(last.prev().id);
      }
    } else {
      manager.moveTo(id + '/child2');
    }
  });
});