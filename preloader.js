(function(exports) {

  var total
    , counter = 0
    , files
    , nowWaiting = true
    , pseudoCounter = 0;

  var params = {
    progressInterval: 50,
    pseudoWait: 1000
  };

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

  var extractImageFiles = function(elem) {
    var result = []
      , style
      , val;
    (function(elem) {
      var nodes
        , node
        , i
        , len;
      if (elem.hasChildNodes()) {
        nodes = elem.childNodes;
        for (i = 0, len = nodes.length; i < len; i++) {
          node = nodes[i];
          if (node.nodeType === 1) {
            if (node.tagName !== undefined) {
              style = node.currentStyle || getComputedStyle(node, '');
              val = (style ? (style.getPropertyValue ? style.getPropertyValue('background-image') : style.backgroundImage) : null);
              //if (val && val !== 'none') result.push(val.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1'));
            }
            if (node.src && node.tagName === 'IMG') {
              result.push(node.src);
            }
            arguments.callee(node);
          }
        }
      }
    })(elem);
    return result;
  };

  var Preloader = function() {
    var that = this
      , i
      , len
      , progressLoop;

    EventEmitter.call(this);
    files = extractImageFiles(document.body);
    if (files.length === 0) {
      setTimeout(function() { that.emit('complete'); }, 0);
      return;
    }
    total = files.length;
    progressLoop = setInterval(function() {
      pseudoCounter++;
      that.emit('progress');
      if (pseudoCounter > Math.floor(params.pseudoWait / params.progressInterval)) {
        nowWaiting = false;
        if (total === counter) {
          clearTimeout(progressLoop);
          that.emit('complete');
        }
      }
    }, params.progressInterval);

    for (i = 0, len = files.length; i < len; i++) {
      var image = new Image();
      //IE7以下だとonloadが非同期で動かない？？
      image.onload = image.onerror = image.onabort = function(e) {
        setTimeout(function() {
          counter++;
          that.emit(e.type);
          if (total === counter && !nowWaiting) {
            clearTimeout(progressLoop);
            that.emit('progress');
            that.emit('complete');
          }
        }, 0);
      };
      image.src = files[i];
    }
  };
  Preloader.prototype = new EventEmitter();

  Preloader.prototype.getTotal = function() {
    return total;
  };

  Preloader.prototype.getLoaded = function() {
    return counter;
  };

  Preloader.prototype.getProportion = function(pseudo) {
    if (pseudo === undefined) pseudo = true;
    if (pseudo) {
      return Math.min((pseudoCounter + 1) * params.progressInterval / params.pseudoWait, counter / total);
    } else {
      return counter / total;
    }
  };

  Preloader.prototype.incLoaded = function() {
    counter++;
  };

  Preloader.prototype.incTotal = function() {
    total++;
  };

  Preloader.init = function(callback, options) {
    var key;
    options = options || {};
    for (key in options) {
      if (key in params) params[key] = options[key];
    }
    var preloader = new Preloader();
    callback(preloader);
  };

  exports.Preloader = Preloader;
})(window);
