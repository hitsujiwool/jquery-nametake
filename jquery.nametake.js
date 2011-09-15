/*
 *  nametake.js
`*
 */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(target) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] === target) {
        return i;
      }
    }
    return -1;
  };
}

(function($) {
  var params = {
    ajaxTagName: 'body',
    lock: false,
    changeTitle: true,
    changeHash: true,
    enablePreloader: true
  };

  var stylesheets = [];

  /*
   * EventEmitter from move.js
   */
  var EventEmitter = function() {
    this.callbacks = {};
  };

  EventEmitter.prototype.on = function(event, fn) {
    (this.callbacks[event] = this.callbacks[event] || []).push(fn);
    return this;
  };

  EventEmitter.prototype.emit = function(event) {
    var args = Array.prototype.slice.call(arguments, 1)
      , callbacks = this.callbacks[event]
      , len;
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
    this.element = element;
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
      , url = this.element.getAttribute('data-page-url');
    if (url) {
      $.ajax({url : url, dataType: 'html', cache: false})
        .success(function(data) {
          var $data = $(data)
            , $head = $('head');
          $(that.element).append($data.find('#' + params.ajaxElement).children());
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
          //IE6だと非同期で呼ばれていなかったので、setTimeoutでwrap
          setTimeout(function() { that.emit('loadcomplete'); }, 0);
          //this.emit('loadcomplete');
        })
        .error(function(data) {
        });
    } else {
      this.isReady = true;
      setTimeout(function() { that.emit('loadcomplete'); }, 0);
    }
  };

  Scene.prototype.getAddress = function() {
    return this.manager.addressOf(this);
  };

  Scene.prototype.indexOf = function(scene) {
    return this.children.indexOf(scene);
  };

  Scene.prototype.isDescendantOf = function(scene) {
    return this.id.indexOf(scene instanceof Scene ? scene.id : scene) === 0;
  };

  Scene.prototype.isSiblingOf = function(scene) {
    return this.parent.indexOf(scene) > -1;
  };

  Scene.prototype.hasPrev = function() {
    return this.parent.indexOf(this) - 1 >= 0;
  };

  Scene.prototype.hasNext = function() {
    return this.parent.indexOf(this) + 1 <= this.parent.children.length - 1;
  };

  Scene.prototype.prev = function() {
    return this.parent.children[this.parent.indexOf(this) - 1];
  };

  Scene.prototype.next = function() {
    return this.parent.children[this.parent.indexOf(this) + 1];
  };

  Scene.prototype.start = function(callback) {
    this._starts.push(callback);
    return this;
  };

  Scene.prototype.end = function(callback) {
    this._ends.push(callback);
    return this;
  };

  Scene.prototype.from = function(selector, callback) {
    return this;
  };

  Scene.prototype.to = function(selector) {
    var i
      , len
      , scenes = this.manager._getScenes(selector);
    for (i = 0, len = scenes.length; i < len; i++) {
      Array.prototype.push.apply(this._transitions[scenes[i].id] = this._transitions[scenes[i].id] || [], Array.prototype.slice.call(arguments, 1));
    }
    return this;
  };

  var Manager = function($root, options) {
    var that = this
      , scenes = {}
      , counter = 0;

    EventEmitter.call(this);
    if (params.enablePreloader) {
      Preloader.init(function(preloader) {
        setTimeout(function() {
          that.emit('preinitialize', preloader);
          preloader.on('complete', function() {
            that.emit('initialize');
          });
        }, 0);
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
      if (this.href.indexOf('#!') > 0) {
        e.preventDefault();
        that.moveTo(this.href.split('#!')[1]);
      }
    });

    this._scenes = scenes;
    this.isLocked = false;
    this.currentScene = location.hash && params.changeHash ? this._getScene(location.hash.split('#!')[1].split('#')[0]) : this.root.children[0];
  };

  Manager.prototype = new EventEmitter();
  Manager.prototype.constructor = Manager;

  Manager.prototype.moveTo = function(target, skipTransition) {
    var that = this
      , tmp = target.split('#')
      , sceneId = tmp[0]
      , anchor = tmp[1] ? '#' + tmp[1] : undefined
      , scene = this._getScene(sceneId);
    if (this.isLocked && params.lock) return;
    if (!scene) throw new Error('cannot find Scene [' + sceneId + ']');
    if (params.changeHash) location.hash = '!' + sceneId;
    document.title = scene.title || '';
    //TODO: きたないのであとでなおす
    if (skipTransition) {
      setTimeout(function() {
        that.emit('transitionstart', that.currentScene);
      }, 0);
      setTimeout(function() {
        that.emit('transitionend', scene, anchor);
      }, 0);
    } else {
      this._fire(this.currentScene, scene, anchor);
    }
    this._route(this.currentScene, scene);
    this.currentScene = this._scenes[sceneId];
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

  Manager.prototype.of = function(selector, callback) {
    var i
      , len
      , scenes = this._getScenes(selector);
    for (i = 0, len = scenes.length; i < len; i++) {
      callback(scenes[i]);
    }
  };

  Manager.prototype._getScene = function(sceneId) {
    return this._scenes[sceneId.split('#')[0]];
  };

  Manager.prototype._getScenes = function(selector) {
    var tmp
      , sceneId
      , regExp = RegExp('^' + selector.replace(/\*/g, '[^/]+') + '$')
      , result = [];
    for (sceneId in this._scenes) {
      if (sceneId.match(regExp) || selector === '*') result.push(this._scenes[sceneId]);
    }
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
        if (nodes[i].className && nodes[i].className.match(/(?:^|\s)page(?:$|\s)/)) {
          scene = new Scene(this, nodes[i], parent.id + (parent.id === '/' ? '' : '/') + nodes[i].getAttribute('data-page-id'));
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

  Manager.prototype.addressOf = function(scene) {
    //TODO: ここは適当なので直す！
    var res, i, len;
    for (i = 0, len = this.root.children.length; i < len; i++) {
      if (this.root.children[i] === scene) {
        res = i;
        break;
      }
    }
    return res;
  };

  Manager.prototype._route = function(from, to) {
    //console.log(from.id + ' -> ' + to.id);
    var that = this
      , scene
      , result = [];
    var route = (function(from, to) {
      var sceneId
        , route = [];
      if (to === from) {
        return [from];
      } else if (to.isDescendantOf(from)) {
        sceneId = to.id;
        while (sceneId !== from.id) {
          route.unshift(that._getScene(sceneId));
          sceneId = sceneId.slice(0, sceneId.lastIndexOf('/')) || '/';
        }
        route.unshift(from);
        return route;
      } else if (to.isSiblingOf(from)) {
        return [from, to];
      } else {
        return [from].concat(arguments.callee(from.parent, to));
      }
    })(from, to);
    while (scene = route.shift()) {
      result.push(scene);
      if (route[1] && scene.isSiblingOf(route[1])) {
        route.shift();
      }
    }
    return result;
  };

  Manager.prototype._fire = function(from, to, anchor) {
    var that = this
      , i = 0
      , route = this._route(from, to);
    //console.log(route.map(function(i) { return i.id; }).join(' -> '));

    var next = function() {
      that._run(route[i], route[i + 1], i < route.length - 2 ? next : end);
      i++;
    };

    var tickEnd = function() {
      setTimeout(function() {
        that.isLocked = false;
        that.emit('transitionend', to, anchor);
      }, 0);
    };

    var end = function() {
      to._ends.length > 0 ? to._ends[0](tickEnd) : tickEnd();
    };

    if (route.length >= 2) {
      this.isLocked = true;
      this.emit('transitionstart', from);
      from._starts.length > 0 ? from._starts[0](next) : next();
    }
  };

  Manager.prototype._run = function(from, to, end) {
    var tickEnd = function() { setTimeout(end, 0); };

    var that = this
      , i = 0
      , transitions = from._transitions[to.id];

    var tickNext = function(err) {
      setTimeout(function() {
        if (err instanceof Error) {
          throw err;
        }
        transitions[i](to, i < transitions.length - 1 ? tickNext : tickEnd);
        i++;
      }, 0);
    };
    if (!transitions) {
      tickEnd();
    } else {
      tickNext();
    }
  };

  $.fn.nametake = function(options) {
    params = $.extend(params, options);
    return new Manager(this);
  };


}(jQuery));