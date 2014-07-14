node-barney
===========

[![NPM version](https://badge.fury.io/js/barney.svg)](http://badge.fury.io/js/barney)
[![Build Status](https://travis-ci.org/mkretschek/node-barney.svg?branch=master)](https://travis-ci.org/mkretschek/node-barney)
[![Coverage Status](https://coveralls.io/repos/mkretschek/node-barney/badge.png)](https://coveralls.io/r/mkretschek/node-barney)
[![Code Climate](https://codeclimate.com/github/mkretschek/node-barney.png)](https://codeclimate.com/github/mkretschek/node-barney)

Allows to change node require()'s module loading behavior.

---

If, for some reason, you need to hook into the module-loading process to change
the results of a `require()`, this might help you. Just be sure you know what
you are doing.

Some use cases I've found for this:

* Count how many times modules are required;
* Mock modules;
* Simulate missing modules;


Usage
-----

```
npm install barney
```

Then in your module:

```js
var barney = require('barney');

barney
  .enable()

  // Mock 'foo' module
  .hook(function (request) {
    if (request === 'foo') {
      return fooMock;
    }
  })

  // Simulate missing 'bar' module
  .hook(function (request) {
    if (request === 'bar') {
      barney.moduleNotFound();
    }
  });

var foo = require('foo');
assert.equals(foo, fooMock);

try {
  var bar = require('bar');
} catch (err) {
  assert.equals(err.code, 'MODULE_NOT_FOUND');
}
```

Make sure you add your hooks with `barney.hook()` and enable them with
`barney.enable()` before using `require()`.


Documentation
-------------

### `barney.enable()`

Enables the hooks, executing them on any subsequent `require()` call until
`barney.disable()` is called again.

Enabling/disabling hooks does not change the hook list, therefore you may
enable/disable without worring about the hook list.


### `barney.disable()`

Restores the original behavior for the `require()` function. It **does not**
removes the hooks from the list. Just makes sure they are not executed when
`require()` is called.


### `barney.hook(hook)`

Adds hooks to the list. A hook is a function that receives three parameters:

* `request`: the value passed to `require()`;
* `parent`: a reference to the parent module object (the module that called
    `require()`;
* `isMain`: indicates whether this is the process' main module;

The first one is probably the one you'll be using the most to customize
the loading of specific modules.

Module functions are executed in the order they are added until one of them
returns a value (other than `undefined`) or an error is thrown, which would
prevent further hooks from being executed.

If no value is returned nor an error is thrown by any hook, the default load
function is called and the module is looked up as expected.

Hooks may be added at any time, you don't need to worry about whether
barney is enabled or disabled. Just make sure both the hooks are added and
barney is enabled before calling `require()`.


### `barney.unhook(hook)`

**Alias:** `barney.clear()`

Removes the given hook from the list. If no hook is given, clears the hook
list.


### `barney.moduleNotFound(message)`

A helper that throws a `MODULE_NOT_FOUND` error, helping simulate missing
modules.


License
-------

This project is licensed under MIT license. See the `LICENSE` file for more
details.
