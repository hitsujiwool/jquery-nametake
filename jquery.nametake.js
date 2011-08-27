/*
 *  nametake.js
` *
 */

(function($) {

  var params = {
    enableInitialTransition: true
  , ajaxTagName: 'body'
  , lockDuringTransition: 'false'
  , changeTitle: 'true'
  , changeHash: 'true'
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
    this._start = [];
    this._end = [];
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
      $.ajax({url : url, dataType: 'html'})
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
          that.emit('loadcomplete');
        })
        .error(function(data) {
        });
    } else {
      this.isReady = true;
      this.emit('loadcomplete');
    }
  };

  Scene.prototype.getAddress = function() {
    return this.manager.addressOf(this);
  };

  Scene.prototype.indexOf = function(scene) {
    return this.children.indexOf(scene);
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

  Scene.prototype.start = function() {
    return this;
  };

  Scene.prototype.end = function() {
    return this;
  };

  var Manager = function($root, options) {
    var that = this
      , scenes = {}
      , counter = 0;
    this.root = this._parseScene($root.get(0), function(scene) {
      counter++;
      scene.on('loadcomplete', function(scene) {
        counter--;
        if (counter === 0) that.emit('initialize');
      });
      scene.load();
      if (scenes[scene.id]) {
        throw new Error('Scene [' + scene.id + '] already exists!');
      } else {
        scenes[scene.id] = scene;
      }
    });
    EventEmitter.call(this);
    this._scenes = scenes;
    this.currentScene = location.hash && params.changeHash ? this._getScene(location.hash.split('#!')[1].split('#')[0]) : this.root.children[0];
  };

  Manager.prototype = new EventEmitter();
  Manager.prototype.constructor = Manager;

  Manager.prototype.moveTo = function(target) {
    var tmp = target.split('#')
      , sceneId = tmp[0]
      , anchor = tmp[1] ? '#' + tmp[1] : undefined
      , scene = this._getScene(sceneId);
    if (!scene) throw new Error('cannot find Scene [' + sceneId + ']');
    if (params.changeHash) location.hash = '!' + sceneId;
    document.title = scene.title || '';
    this._run(this.currentScene, scene, anchor);
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
      , regExp = RegExp('^' + selector.replace(/\//g, '\/').replace(/\*/g, '.+') + '$')
      , result = [];
    for (sceneId in this._scenes) {
      if (sceneId.match(regExp)) result.push(this._scenes[sceneId]);
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

  Manager.prototype._run = function(start, arrival, anchor) {
    var that = this
      , i = 0;

    var end = function() {
      that.emit('transitionend', arrival, anchor);
    };

    var next = function(err) {
      if (err instanceof Error) {
        throw err;
      }
      start._transitions[arrival.id][i](arrival, i === start._transitions[arrival.id].length - 1 ? end : function() { setTimeout(next, 0); });
      i++;
    };
    this.emit('transitionstart', start);
    if (start._transitions[arrival.id].length === 0 || start === arrival) {
      this.emit('transitionend', arrival, anchor);
    } else {
      next();
    }
  };

  $.fn.nametake = function(options) {
    params = $.extend(params, options);
    return new Manager(this);
  };

}(jQuery));