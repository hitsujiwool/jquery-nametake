
;(function(exports) {
  
  var files,      
      numImages,
      counter = 0,
      pseudoCounter = 0,
      pseudoRunning = true;


  var params = {
    progressInterval: 50,
    pseudoWait: 1000
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

  var extractImageFiles = function(elem) {
    var result = [],
        style,
        val;

    function iter(elem) {
      var nodes,
          node;
      if (elem.hasChildNodes()) {
        nodes = elem.childNodes;
        for (var i = 0, len = nodes.length; i < len; i++) {
          node = nodes[i];
          if (node.nodeType === 1) {
            if (node.tagName !== undefined) {
              style = node.currentStyle || getComputedStyle(node, '');
              val = (style ? (style.getPropertyValue ? style.getPropertyValue('background-image') : style.backgroundImage) : null);
              if (val && val !== 'none') result.push(val.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1'));
            }
            if (node.src && node.tagName === 'IMG') {
              result.push(node.src);
            }
            iter(node);
          }
        }
      }
    }

    iter(elem);

    return result;
  };

  function Preloader() {
    EventEmitter.call(this);
  };

  Preloader.prototype = new EventEmitter();
  
  Preloader.prototype.setup = function() {
    var that = this,
        progressLoop;
    
    files = extractImageFiles(document.body);
    numImages = files.length;

    if (files.length === 0) {
      setTimeout(function() { that.emit('complete'); });
      return;
    }
    
    progressLoop = setInterval(function() {
      pseudoCounter++;
      that.emit('progress', that.getProportion());
      if (pseudoCounter >= Math.floor(params.pseudoWait / params.progressInterval)) {
        pseudoRunning = false;
        if (numImages === counter) {
          clearTimeout(progressLoop);
          if (that.getProportion() !== 1) {
            that.emit('progress', 1);
          }
          that.emit('complete');
        }
      }
    }, params.progressInterval);

    for (var i = 0, len = files.length; i < len; i++) {
      var image = new Image();
      image.onload = image.onerror = image.onabort = function(e) {
        //IE7以下だとonloadが非同期で動かない？？　念のためsetTimeoutで囲む
        setTimeout(function() {
          counter++;
          that.emit('progress', that.getProportion());
          that.emit(e.type);
          if (numImages === counter && !pseudoRunning) {
            clearTimeout(progressLoop);
            that.emit('complete');
          }
        });
      };
      image.src = files[i];
    }
  };

  Preloader.prototype.getTotal = function() {
    return numImages;
  };

  Preloader.prototype.getLoaded = function() {
    return counter;
  };

  Preloader.prototype.getProportion = function() {
    return Math.min((pseudoCounter) * params.progressInterval / params.pseudoWait, counter / numImages);
  };

  Preloader.init = function(callback, options) {
    options = options || {};
    for (var key in options) {
      if (key in params) params[key] = options[key];
    }
    var preloader = new Preloader();
    callback(preloader);
    preloader.setup();
  };

  exports.Preloader = Preloader;

})(this);