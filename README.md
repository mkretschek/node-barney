node-barney
===========

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