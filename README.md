# barney ![Build Status](https://codeship.com/projects/ce6bd040-ac83-0132-acda-4e5346bb67f3/status?branch=v1.1)

[![NPM version](https://badge.fury.io/js/barney.svg)](http://badge.fury.io/js/barney)
[![Coverage Status](https://coveralls.io/repos/mkretschek/node-barney/badge.svg?branch=v1.1)](https://coveralls.io/r/mkretschek/node-barney?branch=v1.1)

Change the module loading mechanism.

`barney` allows you to hook into the module loading mechanism to
easily trigger functions or return a given value everytime a
module is required. Just make sure you know what you're doing, as this is
intended to be used mainly during testing or development.

## Instalation

As usual:

```bash
npm install barney
```

## Usage

Once you require `barney`, `require()` will already be hooked. Just add
`hook`s and `interceptor`s.

```js
var barney = require('barney');

// Add a hook to the `foo` module
barney.hook('foo', 'bar');
var foo = require('foo');
assert.equal(foo, 'bar');

var count = 0;

// Add an interceptor
barney.intercept(function () {
  count += 1;
});

var path = require('path');
var fs = require('fs');
assert.equal(count, 2);
```

See the complete [API reference](#node-barney-api-reference).

### Interceptors

Interceptors are functions called whenever you require a module. Interceptors
are executed sequentially and if any of them returns a truthy value, the
chain is stopped and that value will be used as the return value for the
`require()` call:


```js
var count = 0;

// Count how many times `require()` is used
barney.intercept(function () {
  count += 1;
  console.log(count + ' requires...');
});

var path = require('path');
//> Logs '1 requires...'

var fs = require('fs');
//> Logs '2 requires...'
```

You can also add an interceptor for a specific module:

```js
var pathCount = 0;

// Count how many times the `path` module has been required
barney.intercept('path', function () {
  pathCount += 1;
  console.log('`path` has been required ' + pathCount + ' times...');
});

var path = require('path');
//> Logs '`path` has been required 1 times...'

var fs = require('fs');
//> Logs nothing

var path = require('path');
//> Logs '`path` has been required 2 times...'
```

> **NOTE:** interceptors are run before the original loader function is
> executed, therefore they will be executed even if the module has already
> been loaded and in cache.

Interceptors receive the same arguments as the original loader function:

```js
barney.intercept(function (request, parent, isMain) {
  // `request`  - is the string passed to `require()`;
  // `parent`   - is the module which called `require()`;
  // `isMain`   - is `true` if the module was invoked from the command line;

  if (request === 'path') {
    console.log('`path` is being required!');
  }
});
```

> **NOTE:** at this point `request` has not yet been resolved. You probably
> want to resolve it using `require.resolve(request)` before using it.

It is also important to keep in mind that no further interceptor is called
if one of them returns a truthy value:

```js
barney.intercept('foo', function () {
  return 'foo';
});

barney.intercept('foo', function () {
  console.log('This will never be logged...');
});

require('foo');
// No log message is printed...
```

> **NOTE:** generic interceptors (interceptors not attached to a specific
> module) are always executed **before** module-specific interceptors.

### Hooks

Hooks are static values that should be returned for specific modules. It
has almost the same effect as returning a value from an interceptor:

```js
var assert = require('assert');

var xhrStub = sinon.stub();

// Replace the `xhr` module with a stub
barney.hook('xhr', xhrStub);

var xhr = require('xhr');
assert.equal(xhr, xhrStub);
```

> **NOTE:** Hooks differ from interceptors as they are called only after all
> interceptors have been run:
>
>     barney.intercept('foo', function () {
>       return 'foo';
>     });
>
>     barney.hook('foo', 'bar');
>
>     // Note that the interceptor has higher priority over hooks
>     assert.equal(require('foo'), 'foo);
>     assert.notEqual(require('foo'), 'bar');
>


### The `.use()` function

`barney.use()` wraps `.intercept()` and `.hook()` in a way that may make more
sense to some users. It's just a (slightly) different way of getting the
same results:

* Adding a **generic interceptor**:

    ```js
    barney.use(function () {...});
    ```

* Adding a **module-specific interceptor**:

    ```js
    // `false` indicates that the result should not be cached (which would
    // be the same as adding a hook). Without it, the `function` itself
    // would be returned by `require('foo')`.
    barney.use('foo', function () {...}, false);
    ```

* Adding a **hook**:

    ```js
    barney.use('foo', stub);
    ```

## Priorities

This is an overview of the priorities when loading a module:

1. all **generic interceptors** are executed;
2. if none returns a truthy value, all **module-specific interceptors** are
   executed;
3. if no value has been returned yet, we check if a static hook is registered
   for the requested module;
4. if no value is found, we hand the request over to the original loader
   function;


## Restoring & cleaning up

After you are done messing with the `require()` function, you can deactivate
`barney` and restore the original loader using `barney.restore()`. This
**keeps** all interceptors and hooks in place.

After restoring the original `require()` function, you can hook it again
calling `barney.hook()` (without params).

To clear all hooks and interceptors, you can use `barney.reset()`. Or you
can specify a module to be cleared: `barney.reset('foo')`.

In case you need to force the original loader to reload a module (`require()`
caches the loaded modules), you can do so using `barney.unload('foo')`.


<a id="node-barney-api-reference"></a>
## Reference

> **NOTE:** unless otherwise stated, all methods are chainable.

### barney.hook()

Activates `barney`'s hooks. This is automatically called the first
time `barney` is required.

---

### barney.restore() (or `barney.unhook()`)

Restores the original `require()` method. Hooks and interceptors are kept.
See `barney.reset()` for removing hooks and interceptors.

---

### barney.hook(module, value)

Sets the hooked value for the given module. Future calls to `require(module)`
will return `value` (unless an interceptor returns a different value).

---

### barney.intercept(function[, index])

Adds a generic interceptor to the stack. The interceptor will be executed
for **all** future calls to `require()` (for all modules). If it returns a
truthy value, that will be the value returned by `require()`.

If `index` is defined, the interceptor will be inserted at the given index.

Interceptors cannot be added twice.

---

### barney.intercept(module, function[, index])

Same as the previous, but adds the interceptor to a specific `module`.

---

### barney.reset([module])

Removes all hooks and interceptors. If a `module` is defined, removes hooks
and interceptors for that module only.

---

### barney.unload(module)

Removes the cached value for `module` from the original `require()` cache.

---

### barney.use(module, value)

Alias for `barney.hook(module, value)`.

---

### barney.use(module, function, false)

Alias for `barney.intercept(module, function)`.

---

### barney.use(function)

Alias for `barney.intercept(function)`.

---

### barney.isActive() (not chainable)

Returns `true` if barney is hooked into `require()`.

---

### barney.notFound([module]) (not chainable if called without args)

If a `module` is defined, adds an interceptor that will throw a
"MODULE_NOT_FOUND" error.

```js
barney.notFound('foo');
```

If called without arguments (or with more than one argument), throws a
"MODULE_NOT_FOUND" error to help simulating missing modules.

```js
barney.intercept('foo', barney.notFound);
```


## Example

### Hooking a module for testing

This uses `sinon-chai` and `mocha`:

```js

var barney = require('barney');
var sinon = require('sinon');
var chai = require('chai');

chai.use(require('sinon-chai'));

var xhrStub = sinon.stub();

// During tests, if we believe a module is well tested enough, we may just
// make sure that it is used as expected, avoiding actually calling them
// in order to simplify our tests.
//
// In this example, we can avoid the actual HTTP request that the `xhr` module
// would make by using a stub and could make some tests synchronous.
barney.hook('xhr', xhrStub);

// All `require('xhr')` in `myModule` will now use the `xhrStub` instead of
// the actual `xhr` module.
var myModule = require('./my-module');

describe('.load(url, callback)', function () {
  ...
  it('calls the callback on success', function () {
    // `xhr`'s original signature is `xhr(config, callback)`, so we make the
    // stub call the second argument (index 1) passed to it...
    xhrStub.callArgWith(1, null, {status: 200});

    var callback = sinon.stub();
    myModule.load('./foo/bar/baz.json', callback);

    expect(xhrStub).to.have.been.called;
    expect(callback).to.have.been.called;
    ...
  });
});

```


## License

This is an open source project released under the MIT license terms.

