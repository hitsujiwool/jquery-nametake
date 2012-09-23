
/*!
 * jquery.nametake
 * Copyright(c) 2012 hitsujiwool <utatanenohibi@gmail.com>
 * MIT Licensed
 */

(function($) {

  /**
   * Utility functions
   */

  var util = {
    // for IE compatibility
    indexOf: function(array, target) {
      if (typeof Array.prototype.indexOf === 'function') {
        return array.indexOf(target);
      } else {
        for (var i = 0; i < array.length; i++) {
          if (array[i] === target) {
            return i;
          }
        }
        return -1;
      }
    },
    logger: function(enabled) {
      if (enabled) {
        if (!window.console) {
          window.console = {
            log: function() {}
          };
        };
        return function(msg) {
          console.log(msg);
        };
      } else {
        return function(msg) {};
      }
    }
  };

  var log;
  
  var params = {
    lock: true,
    changeTitle: false,
    changeHash: false,
    enablePreloader: false
  };

  /**
   * EventEmitter Pattern from move.js written by visionmedia
   * https://github.com/visionmedia/move.js/blob/master/move.js
   */

  var EventEmitter = function() {
    this.callbacks = {};
  };

  EventEmitter.prototype.on = function(event, fn) {
    (this.callbacks[event] = this.callbacks[event] || []).push(fn);
    return this;
  };

  EventEmitter.prototype.emit = function(event) {
    var args = Array.prototype.slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        len;
    if (callbacks) {
      len = callbacks.length;
      for (var i = 0; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };

  var Scene = function(manager, element, id, title) {
    EventEmitter.call(this);
    this.children = [];
    this.element = $(element);
    this.manager = manager;
    this.id = id;
    this.transitions = {};
    this.title = title;
  };

  // inherit EventEmitter
  Scene.prototype = new EventEmitter();

  Scene.prototype.addScene = function(scene) {
    this.children.push(scene);
    this.numChildren = this.children.length;
  };

  /**
   * Register 'to' callbacks.
   * 
   * @param {String} event
   * @param {Function} callback
   * @return {Scene}
   */

  Scene.prototype.to = function(event, callback) {
    switch (event) {
    case 'child':
      this.toChild(callback);
      break;
    case 'parent':
      this.toParent(callback);
      break;
    case 'sibling':
      this.toSibling(callback);
      break;
    case 'any':
      this.toChild(callback);
      this.toParent(callback);
      this.toSibling(callback);      
      break;
    default:
      throw new Error('Unknown event ' + event + '.');
    }
    return this;
  };

  Scene.prototype.toChild = function(callback) {
    var that = this;
    $.each(this.children, function(i, scene) {
      (that.transitions[scene.id] = that.transitions[scene.id] || []).push({ type: 'to', callback: callback });
    });
    return this;
  };

  Scene.prototype.toParent = function(callback) {
    (this.transitions[this.parent.id] = this.transitions[this.parent.id] || []).push({ type: 'to', callback: callback });
    return this;
  };

  Scene.prototype.toSibling = function(callback) {
    var that = this;
    $.each(this.manager.getScenes(function(scene) { return scene.isSiblingOf(that); }), function(i, scene) {
      (that.transitions[scene.id] = that.transitions[scene.id] || []).push({ type: 'to', callback: callback });
    });
    return this;
  };

  /**
   * Register 'from' callbacks.
   * 
   * @param {String} event
   * @param {Function} callback
   * @return {Scene}
   */

  Scene.prototype.from = function(event, callback) {
    switch (event) {
    case 'child':
      this.fromChild(callback);
      break;
    case 'parent':
      this.fromParent(callback);
      break;
    case 'sibling':
      this.fromSibling(callback);
      break;
    case 'any':
      this.fromChild(callback);
      this.fromParent(callback);
      this.fromSibling(callback);      
      break;
    default:
      throw new Error('Unknown event ' + event + '.');
    }
    return this;
  };

  Scene.prototype.fromChild = function(callback) {
    var that = this;
    $.each(this.children, function(i, scene) {
      (scene.transitions[that.id] = scene.transitions[that.id] || []).push({ type: 'from', callback: callback });
    });
    return this;
  };

  Scene.prototype.fromParent = function(callback) {
    (this.parent.transitions[this.id] = this.parent.transitions[this.id] || []).push({ type: 'from', callback: callback });
    return this;
  };

  Scene.prototype.fromSibling = function(callback) {
    var that = this;
    $.each(this.manager.getScenes(function(scene) { return scene.isSiblingOf(that); }), function(i, scene) {
      (scene.transitions[that.id] = scene.transitions[that.id] || []).push({ type: 'from', callback: callback });
    });
    return this;
  };

  /**
   * Apply scene.indexOf() with its parent and itself.
   */

  Scene.prototype.index = function() {
    return (this === this.manager.root) ? 0 : this.parent.indexOf(this);
  };

  /**
   * Return index of a given scene.
   * 
   * @param {Scene} scene
   * @return {Number}
   */

  Scene.prototype.indexOf = function(scene) {
    return util.indexOf(this.children, scene);
  };

  /**
   * Whether it is decendant of a given scene.
   * 
   * @param {Scene} scene
   * @return {Boolean}
   */

  Scene.prototype.isDescendantOf = function(scene) {
    return this.id.indexOf(scene instanceof Scene ? (scene.id === '/' ? '/' : scene.id + '/') : scene) === 0;
  };

  /**
   * Whether it is sibling of a given scene.
   * 
   * @param {Scene} scene
   * @return {Boolean}
   */

  Scene.prototype.isSiblingOf = function(scene) {
    return this === this.manager.root ? false : this.parent.indexOf(scene) > -1 && this !== scene;
  };

  /**
   * Whether it has older sibling.
   * 
   * @return {Boolean}
   */

  Scene.prototype.hasPrev = function() {
    return this === this.manager.root ? false : this.parent.indexOf(this) - 1 >= 0;
  };

  /**
   * Whether it has younger sibling.
   * 
   * @return {Boolean}
   */

  Scene.prototype.hasNext = function() {
    return this === this.manager.root ? false : this.parent.indexOf(this) + 1 <= this.parent.children.length - 1;
  };

  /**
   * Return its older sibling.
   * 
   * @return {Scene}
   */

  Scene.prototype.getPrev = function() {
    return this === this.manager.root ? undefined : this.parent.children[this.parent.indexOf(this) - 1];
  };

  /**
   * Return its younger sibling.
   * 
   * @return {Scene}
   */

  Scene.prototype.getNext = function() {
    return this === this.manager.root ? undefined : this.parent.children[this.parent.indexOf(this) + 1];
  };

  function Queue() {
    this.callbacks = [];
    this.argsAlwaysPassed = { none: [] };
    this.piped = [];
  }

  /**
   * Assign what arguments to be passed.
   * 
   * @param {String} type
   * @param {...Mixed} args
   */

  Queue.prototype.pass = function(type) {    
    var args = Array.prototype.slice.call(arguments, 1);
    if (type === 'none') {
      throw new Error('Sorry, type "none" is already reserved.');
    }
    this.argsAlwaysPassed[type] = args;
    return this;
  };

  /**
   * Queue callback.
   * 
   * @param {Function} callback
   */

  Queue.prototype.queue = function(type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = 'none';
    }
    this.callbacks.push({ type: type, callback: callback });
    return this;
  };

  /**
   * Pipe another queue
   * 
   * @param {...Queue} args
   */

  Queue.prototype.pipe = function() {
    var queues = Array.prototype.slice.call(arguments),
        next = queues.shift();     
    if (next) {
      this.piped.push(next);
      next.pipe.apply(next, queues);
    }
    return this;
  };

  /**
   * Execute callback sequentially
   * 
   * @param {Function} end
   */

  Queue.prototype.run = function(initialVal, end) {
    var that = this,
        i = 0,
        data = initialVal;
    function next(res) {
      var task = that.callbacks[i++],
          callback,
          type;
      data = res;
      if (!task) {
        if (that.piped.length > 0) {
          for (var j = 0, len = that.piped.length; j < len; j++) {
            that.piped[j].run(res, end);
          }
        } else {
          end && end(data);
        }
      } else {
        callback = task.callback,
        type = task.type;
        if (callback.length <= that.argsAlwaysPassed[type].length + 1) {
          // call sync
          callback.apply(null, that.argsAlwaysPassed[type].concat([data]));
          next(data);
        } else {
          // wait for 'next' to be called
          callback.apply(null, that.argsAlwaysPassed[type].concat([data, next]));
        }
      }
    }

    // execute first callback
    next(data);
  };

  var Manager = function($root, options) {
    var that = this,
        scenes = {},
        counter = 0,
        initialScene;

    EventEmitter.call(this);
    scenes['/'] = this.root = this.parseScene($root.get(0), function(scene) {
      if (scenes[scene.id]) {
        throw new Error('Scene [' + scene.id + '] already exists!');
      } else {
        scenes[scene.id] = scene;
      }
    });

    this.scenes = scenes;

    initialScene = params.initialSceneId ? this.getScene(params.initialSceneId) : this.root.children[0];
    if (params.changeHash && location.hash) {
      initialScene = this.getScene(location.hash.split('#!')[1]);
    }

    if (params.enablePreloader) {
      Preloader.init(function(preloader) {
        setTimeout(function() {
          that.emit('preinitialize', preloader, function() {
            that.emit('initialize', initialScene);
          });
        });
      });
    } else {
      setTimeout(function() { this.emit('initialize', initialScene); });
    }

    $('a').live('click', function(e) {
      if (this.href.indexOf('#!') > -1) {
        e.preventDefault();
        that.moveTo(this.href.split('#!')[1]);
      }
    });

    $(window).bind('hashchange', function(e) {
      var to;
      e.preventDefault();
      if (location.hash.indexOf('#!') > -1) {
        to = that.getScene(location.hash.split('#!')[1]);
        if (to === undefined) {
          that.emit('404');
          return;
        } else {
          that.run(that.currentScene, to);
        }
      }
    });

    this.isLocked = false;
    this.currentScene = this.root;
  };

  Manager.prototype = new EventEmitter();

  Manager.prototype.moveTo = function(target) {
    var to = target instanceof Scene ? target : this.getScene(target);
    if (to === undefined) {
      this.emit('404');
      return;
    }
    if (this.currentScene === to) return;
    if (this.isLocked && params.lock) return;
    if (params.changeHash) {
      if (location.hash.split('#!')[1] === to.id || typeof document.body.style.maxHeight === undefined) {
        //初回読み込み時ですでに目的地のlocation.hashが付与されている場合は明示的にhashchangeイベントを発火
        //IE6の場合も発火
        location.hash = '!' + to.id;
        $(window).trigger('hashchange');
      } else {
        location.hash = '!' + to.id;
      }
    } else {
      this.run(this.currentScene, to);
    }
  };

  Manager.prototype.moveToPrev = function() {
    if (this.currentScene.hasPrev()) {
      this.moveTo(this.currentScene.getPrev());
    }
  };

  Manager.prototype.moveToNext = function() {
    if (this.currentScene.hasNext()) {
      this.moveTo(this.currentScene.getNext());
    }
  };

  Manager.prototype.of = function(filter, callback) {
    if (typeof filter === 'string') {
      callback(this.getScene(filter));
    } else if (filter instanceof RegExp) {
      $.each(this.getScenes(filter), function(i, scene) {
        callback(scene);
      });
    }
    return this;
  };

  Manager.prototype.getScene = function(sceneId) {
    return this.scenes[sceneId];
  };

  Manager.prototype.getScenes = function(filter) {
    var result = [];
    $.each(this.scenes, function(id, scene) {
      if (filter === null) {
        result.push(scene);
      } else if (filter instanceof RegExp && filter.test(id)) {
        result.push(scene);        
      } else if (typeof filter === 'function' && filter(scene)) {
        result.push(scene);
      }
    });
    return result;
  };

  Manager.prototype.parseScene = function(elem, callback, parent) {
    var i,
        nodes,
        len,
        scene;
    parent = parent || new Scene(this, elem, '/');
    if (elem.hasChildNodes()) {
      nodes = elem.childNodes;
      for (i = 0, len = nodes.length; i < len; i++) {
        if (nodes[i].nodeType === 1 && nodes[i].getAttribute('data-nametake-id')) {
          scene = new Scene(this,
                            nodes[i],
                            parent.id + (parent.id === '/' ? '' : '/') + nodes[i].getAttribute('data-nametake-id'),
                            nodes[i].getAttribute('data-nametake-title')
                           );
          if (typeof callback === 'function') callback(scene);
          scene.parent = parent;
          parent.addScene(this.parseScene(nodes[i], callback, scene));
        } else {
          parent = this.parseScene(nodes[i], callback, parent);
        }
      }
    }
    return parent;
  };

  Manager.prototype.route = function(from, to) {
    var that = this,
        scene,
        result = [];
    var route = (function(from, to) {
      var sceneId,
          tmp = [];
      if (to === from) {
        return [from];
      } else if (to.isDescendantOf(from)) {
        sceneId = to.id;
        while (sceneId !== from.id) {
          tmp.unshift(that.getScene(sceneId));
          sceneId = sceneId.slice(0, sceneId.lastIndexOf('/')) || '/';
        }
        tmp.unshift(from);
        return tmp;
      } else if (to.isSiblingOf(from)) {
        return [from, to];
      } else {
        return [from].concat(arguments.callee(from.parent, to));
      }
    })(from, to);

    scene = route.shift();
    while (scene) {      
      result.push(scene);
      if (route[1] && scene.isSiblingOf(route[1])) {
        route.shift();
      }
      scene = route.shift();
    }
    return result;
  };

  Manager.prototype.run = function(from, to) {
    var that = this,
        route = this.route(from, to),
        queues = [],
        first;

    function end() {
      that.isLocked = false;
      that.currentScene = to;
      if (to.title) {
        document.title = to.title;
      }
      log('trigger event transitionend');
      that.emit('transitionend');
    };
    
    if (route.length >= 2) {
      queues = [];
      for (var i = 0, len = route.length - 1; i < len; i++) {
        queues.push(this.createQueue(route[i], route[i + 1]));
      }
      first = queues.shift();
      first.pipe.apply(first, queues);
      this.isLocked = true;
      log('trigger event transitionstart');
      this.emit('transitionstart');
      first.run(null, end);
    }
  };

  Manager.prototype.createQueue = function(from, to) {
    var q = new Queue(),
        transitions = from.transitions[to.id];
    q.pass('from', from);
    q.pass('to', to);
    for (var i = 0, len = transitions.length; i < len; i++) {
      q.queue(transitions[i].type, transitions[i].callback);
    }
    return q;
  };

  $.nametake = function(context, options) {
    params = $.extend(params, options);
    log = util.logger(arguments.callee.debug);
    return new Manager($(context));
  };

  $.nametake.debug = false;

  $.nametake.version = '0.2.0';

}(jQuery, this));