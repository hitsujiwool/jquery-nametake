/**
 * nametake.js
 */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(target) {
    var i;
    for (i = 0; i < this.length; i++) {
      if (this[i] === target) {
        return i;
      }
    }
    return -1;
  };
}

var net = net || {};
net.hitsujiwool = net.hitsujiwool || {};

net.hitsujiwool.utils = {
  inject: function(array, initial, callback) {
    var i,
        len;
    for (i = 0, len = array.length; i < len; i++) {
      initial = callback(initial, array[i]);
    }
    return initial;
  },
  runQueue: function(queue, callback) {
    var i = 0,
        len = queue.length,
        args = Array.prototype.slice.call(arguments, 2);    
    var next = function() {
      queue[i].apply(null, args.concat([
        function() {
          net.hitsujiwool.utils.nextTick(i < len - 1 ? next : callback);
        }
      ]));
      i++;
    };
    queue.length > 0 ? next() : net.hitsujiwool.utils.nextTick(callback);
  },
  nextTick: function(callback) {
    setTimeout(callback, 0);
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

(function($) {
  var utils = net.hitsujiwool.utils,
      log;

  var params = {
    ajaxTagName: 'body',
    lock: false,
    changeTitle: true,
    changeHash: true,
    enablePreloader: true
  };

  var stylesheets = [];

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
    this.isReady = false;
    this._transitions = {};
    this._starts = [];
    this._ends = [];
  };
  Scene.prototype = new EventEmitter();

  Scene.prototype.addScene = function(scene) {
    this.children.push(scene);
    this.numChildren = this.children.length;
  };

  Scene.prototype.load = function() {
    var that = this
      , url = this.element.attr('data-page-url');
    if (url) {
      $.ajax({url : url, dataType: 'html', cache: false})
        .success(function(data) {
          var $data = $(data)
            , $head = $('head');
          that.element.append($data.find('#' + params.ajaxElement).children());
          $(data).each(function(i, elem) {
             if (elem.tagName == 'LINK') {
               if (stylesheets.indexOf(elem.href) === -1) {
                 stylesheets.push(elem.href);
                 $head.prepend(elem);
               }
             } else if (elem.tagName == 'SCRIPT') {
               $head.prepend(elem);
             } else if (elem.tagName == 'TITLE') {
               that.title = elem.innerText;
             }
          });
          that.isReady = true;
          //IE6だと非同期で呼ばれていなかったので、nextTickを挟む
          utils.nextTick(function() { that.emit('loadcomplete'); });
        })
        .error(function(data) {
        });
    } else {
      this.isReady = true;
      utils.nextTick(function() { that.emit('loadcomplete'); });
    }
  };

  Scene.prototype.index = function(scene) {
    return (this === this.manager.root) ? 0 : this.parent.indexOf(this);
  };

  Scene.prototype.indexOf = function(scene) {
    return this.children.indexOf(scene);
  };

  Scene.prototype.isDescendantOf = function(scene) {
    return this.id.indexOf(scene instanceof Scene ? (scene.id === '/' ? '/' : scene.id + '/') : scene) === 0;
  };

  Scene.prototype.isSiblingOf = function(scene) {
    return this === this.manager.root ? false : this.parent.indexOf(scene) > -1 && this !== scene;
  };

  Scene.prototype.hasPrev = function() {
    return this === this.manager.root ? false : this.parent.indexOf(this) - 1 >= 0;
  };

  Scene.prototype.hasNext = function() {
    return this === this.manager.root ? false : this.parent.indexOf(this) + 1 <= this.parent.children.length - 1;
  };

  Scene.prototype.prev = function() {
    return this === this.manager.root ? undefined : this.parent.children[this.parent.indexOf(this) - 1];
  };

  Scene.prototype.next = function() {
    return this === this.manager.root ? undefined : this.parent.children[this.parent.indexOf(this) + 1];
  };

  Scene.prototype.start = function(callback) {
    this._starts.push(callback);
    return this;
  };

  Scene.prototype.end = function(callback) {
    this._ends.push(callback);
    return this;
  };

  Scene.prototype.toChild = function(callback) {
    var that = this;
    $.each(this.children, function(i, scene) {
      (that._transitions[scene.id] = that._transitions[scene.id] || []).push(callback);
    });
    return this;
  };

  Scene.prototype.toParent = function(callback) {
    (this._transitions[this.parent.id] = this._transitions[this.parent.id] || []).push(callback);
    return this;
  };

  Scene.prototype.toSibling = function(callback) {
    var that = this;
    $.each(this.manager._getScenes(function(scene) { return scene.isSiblingOf(that); }), function(i, scene) {
      (that._transitions[scene.id] = that._transitions[scene.id] || []).push(callback);     
    });
    return this;
  };

  var Manager = function($root, options) {
    var that = this
      , scenes = {}
      , counter = 0;
    EventEmitter.call(this);
    if (params.enablePreloader) {
      Preloader.init(function(preloader) {
        utils.nextTick(function() { that.emit('preinitialize', preloader); });
        that.root = that._parseScene($root.get(0), function(scene) {
          scene.on('loadcomplete', function(scene) {
            preloader.incLoaded();
          });
          preloader.incTotal();
          scene.load();
          if (scenes[scene.id]) {
            throw new Error('Scene [' + scene.id + '] already exists!');
          } else {
            scenes[scene.id] = scene;
          }
        });
      });
    } else {
      that.root = that._parseScene($root.get(0), function(scene) {
        scene.on('loadcomplete', function() {
          counter--;
          if (counter === 0) {
            that.emit('initialize');
          }
        });
        scene.load();
        counter++;
        if (scenes[scene.id]) {
          throw new Error('Scene [' + scene.id + '] already exists!');
        } else {
          scenes[scene.id] = scene;
        }
      });
    }

    $('a').live('click', function(e) {
      if (this.href.indexOf('#!') > -1) {
        e.preventDefault();
        that.moveTo(this.href.split('#!')[1]);
      }
    });

    $(window).bind('hashchange', function(e) {
      var scene;
      e.preventDefault();
      if (location.hash.indexOf('#!') > -1) {
        scene = that._getScene(location.hash.split('#!')[1]);
        if (scene === undefined) {
          that.emit('404');
          return;
        } else {
          that._moveTo(scene);
        }
      }
    });

    scenes['/'] = this.root;
    this._scenes = scenes;
    this.isLocked = false;
    this.initialScene = params.initialSceneId ? this._getScene(params.initialSceneId) : this.root.children[0];
    if (params.changeHash && location.hash) this.initialScene = this._getScene(location.hash.split('#!')[1]);
    this.currentScene = this.root;
  };

  Manager.prototype = new EventEmitter();
  Manager.prototype.constructor = Manager;

  Manager.prototype.initialize = function() {
    var that = this;
    utils.nextTick(function() { that.emit('initialize'); });
  };

  Manager.prototype.moveTo = function(target, skipTransition) {
    var to = target instanceof Scene ? target : this._getScene(target);
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
      this._moveTo(to, skipTransition);
    }
  };

  Manager.prototype._moveTo = function(to, skipTransition) {
    var that = this;
    document.title = to.title || '';
    if (skipTransition) {
      utils.nextTick(function() { that.emit('transitionstart', that.currentScene); }, 0);
      utils.nextTick(function() { that.emit('transitionend', to); }, 0);
    } else {
      this._run(this.currentScene, to);
    }
  };

  Manager.prototype.moveToPrev = function() {
    if (this.currentScene.hasPrev()) {
      this.moveTo(this.currentScene.prev().id);
    }
  };

  Manager.prototype.moveToNext = function() {
    if (this.currentScene.hasNext()) {
      this.moveTo(this.currentScene.next().id);
    }
  };

  Manager.prototype.transition = function() {
    this._transitions = Array.prototype.slice.call(arguments, 0);
  };

  Manager.prototype.of = function(filter, callback) {
    if (typeof filter === 'string') {
      callback(this._getScene(filter));
    } else if (filter instanceof RegExp) {
      $.each(this._getScenes(filter), function(i, scene) {
        callback(scene);
      });
    }
    return this;
  };

  Manager.prototype._getScene = function(sceneId) {
    return this._scenes[sceneId];
  };

  Manager.prototype._getScenes = function(filter) {
    var result = [];
    $.each(this._scenes, function(id, scene) {
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

  Manager.prototype._parseScene = function(elem, callback, parent) {
    var i
      , nodes
      , len
      , scene;
    parent = parent || new Scene(this, elem, '/');
    if (elem.hasChildNodes()) {
      nodes = elem.childNodes;
      for (i = 0, len = nodes.length; i < len; i++) {
        if (nodes[i].nodeType === 1 && nodes[i].getAttribute('data-nametake-id')) {
          scene = new Scene(this, nodes[i], parent.id + (parent.id === '/' ? '' : '/') + nodes[i].getAttribute('data-nametake-id'));
          if (typeof callback === 'function') callback(scene);
          scene.parent = parent;
          parent.addScene(this._parseScene(nodes[i], callback, scene));
        } else {
          parent = this._parseScene(nodes[i], callback, parent);
        }
      }
    }
    return parent;
  };

  Manager.prototype._route = function(from, to) {
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
          tmp.unshift(that._getScene(sceneId));
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

  Manager.prototype._run = function(from, to, skipTransition) {
    var that = this,
        i = 0,
        route = this._route(from, to);

    var next = function() {
      that._fire(route[i], route[i + 1], i < route.length - 2 ? next : end);
      i++;
    };

    var end = function() {
      log('executes ' + to._ends.length + ' callback: ' + 'end ' + to.id);
      utils.runQueue(to._ends, function() {
        that.isLocked = false;
        that.currentScene = to;
        log('trigger event transitionend');
        that.emit('transitionend', to);
      });
    };

    if (route.length >= 2) {
      this.isLocked = true;
      log('trigger event transitionstart');
      this.emit('transitionstart', from);
      log('executes ' + from._starts.length + ' callback: ' + 'start ' + from.id);
      utils.runQueue(from._starts, next);
    }
  };

  Manager.prototype._fire = function(from, to, end) {
    var that = this
      , i = 0
      , transitions = from._transitions[to.id];

    log('executes ' + (transitions ? transitions.length : 0) + ' callback: ' + from.id + ' to ' + to.id);

    if (transitions === undefined) {
      utils.nextTick(end);
    } else {
      utils.runQueue(transitions, end, to);
    }
  };

  $.nametake = function(context, options) {
    params = $.extend(params, options);
    log = net.hitsujiwool.utils.logger(arguments.callee.debug);
    return new Manager($(context));
  };

  $.nametake.debug = false;
}(jQuery));