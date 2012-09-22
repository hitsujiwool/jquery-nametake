# nametake

nametake is a tree-based event dispatcher for managing page transition.

## Usage

### Markup

nametake parses whatever HTML elements with attribute `data-nametake-id`, then constructs a tree structured _Scene_, which can be identified by an url-like ID such as `/foo/hoge` or `/bar/hoge`.

```html
<div data-nametake-id="foo">
    <p>contents of /foo</p>
    <div data-nametake-id="hoge">
        <p>contents of /foo/hoge</p>
    </div>
    <div data-nametake-id="fuga">
        <p>contents of /foo/fuga</p>
    </div>
</div>
<div data-nametake-id="bar">
    <div data-nametake-id="hoge">
        <p>contents of /bar/hoge</p>
    </div>
</div>
```

### Script

You can register any type (sync or async) of, and any number of transition effects which start running after `scene.moveTo()` is called.

```javascript

// setup
var manager = $.nametake('.pages', {
  changeHash: false,
  enablePreloader: true,
  lock: true,
  initialSceneId: '/1'
});

manager.on('preinitiaize', function(preloader, next) {
  preloader.on('progress', function(progress) {
    console.log('now preloading');
  });
  preloader.on('complete', function() {
    console.log('preloading complete');
    next();
  });
});

manager.on('initialize', function(initialScene) {
  manager.moveTo(initialScene);
});

// specify scenes by regular expression (or string)
manager.of(/^\/foo\/.*$/, function(scene) {

  // transition to its sibling scene
  scene.to('sibling', function(to) {
    // without param 'next', callback is executed synchronously
    console.log('do something sync');
  });
  
  // transition to its parent scene
  scene.to('parent', function(to, data, next) {
    // with param 'next', callback is executed asynchronously
    console.log('do something async');
  });  
  
  // transition to its child scene
  scene.to('child', function(to, data, next) {
    console.log('do something');
    console.log(data + 'is passed from preceding callback');
    next('pass some data to following callback');
  });
  
  // wildcard
  scene.to('any', function(to, data, next) {
    console.log('do something when'
  });
  
  // transition from its sibling scene
  scene.from('sibling', function(from) {
    // without param 'next', callback is executed synchronously
    console.log('do something sync');
  });
  
  // transition from its parent scene
  scene.from('parent', function(from, next, data) {
    // with param 'next', callback is executed asynchronously
    console.log('do something async');
  });  
  
  // transition from its child scene
  scene.from('child', function(from, next, data) {
    console.log('do something');
    console.log(data + 'is passed from preceding callback');
    next('pass some data to following callback');
  });  
});

$('#someElement').on('click', function() {
  manager.moveTo('/foo/bar');
});

```

## License

(The MIT License)

Copyright (c) 2012 hitsujiwool &lt;utatanenohibi@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
