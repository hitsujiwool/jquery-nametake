(function(exports) {

  var total
    , counter = 0
    , files
    , nowWaiting = true
    , pseudoCounter = 0;

  var params = {
    progressInterval: 50,
    pseudoWait: 2000
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
    var result = [];
    (function(elem) {
       for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
         if (getComputedStyle(elem)) {
           var val = (elem.currentStyle || getComputedStyle(elem)).getPropertyValue('background-image');
           //if (val && val !== 'none') result.push(val.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1'));
         }
         if (elem.src !== undefined && elem.tagName === 'IMG') {
           result.push(elem.src);
         }
         arguments.callee(elem);
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
    files = extractImageFiles(document);
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
      image.onload = function() {
        counter++;
        if (total === counter && !nowWaiting) {
          clearTimeout(progressLoop);
          that.emit('complete');
        }
      };
      image.src = files[i];
      //document.body.appendChild(image);
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
    pseudo = pseudo || true;
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
