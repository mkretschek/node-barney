barney ![Build Status](https://codeship.com/projects/ce6bd040-ac83-0132-acda-4e5346bb67f3/status?branch=v1.0)
===========

[![NPM version](https://badge.fury.io/js/barney.svg)](http://badge.fury.io/js/barney)
[![Coverage Status](https://coveralls.io/repos/mkretschek/node-barney/badge.svg?branch=v1.0)](https://coveralls.io/r/mkretschek/node-barney?branch=v1.0)

Change the module loading mechanism.

> **NOTE:** this module is intended to be using during testing
> and development, as it is not recommended changing the
> module loading behavior.

`barney` allows you to hook into the module loading mechanism to
easily trigger functions or return a given value everytime a
module is required.

```js
var barney = require('barney');

// At this point `require()` has already been hooked

require('foo');
//> TypeError('Module not found')

// Return a specific value
barney.hook('foo', 'foobar');

require('foo');
//> 'foobar'

var fooCount = 0;

// Add an interceptor function
barney.intercept(function () {
  fooCount += 1;
  console.log(fooCount);
});

require('foo');
//> 1

require('foo');
//> 2

require('path'); // an existing module
//> 3
```