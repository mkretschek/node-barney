'use strict';

var Module = require('module');
var hooks = Object.create(null);
var interceptors = [];
var moduleInterceptors = {};


/**
 * The `barney` module itself.
 * @typedef {object} barney
 */

/**
 * A module interceptor function. It accepts the same params as the original
 * loader function.
 * @see https://github.com/joyent/node/blob/master/lib/module.js#L275
 * @typedef {function(request, parent, isMain)} Interceptor
 */


/**
 * Original loader
 * @private
 */
var originalLoadMethod = Module._load;


/**
 * Hooked loader.
 *
 * @see https://github.com/joyent/node/blob/master/lib/module.js#L275
 * @param request
 * @param parent
 * @param isMain
 * @returns {*}
 * @private
 */
function hookedLoadMethod(request/*, parent, isMain*/) {
  var args = arguments;
  var resolved = resolve(request);

  return intercept(interceptors, args) ||
      intercept(moduleInterceptors[resolved], args) ||
      hooks[resolved] ||
      originalLoadMethod.apply(Module, args);
}

/**
 * A generic method for adding hooks and interceptors:
 *
 * Adds a generic interceptor that will be triggered in every call to
 * `require()`.
 *
 * @param {Interceptor} module
 * @returns {barney}
 *
 * @throws {TypeError} If an invalid interceptor is provided.
 *
 * @returns {barney} Returns the `barney` module itself.
 *
 *
 * @also
 *
 *
 * Adds a hook to a specific module.
 *
 * @param {string} module
 * @param {*} value
 *
 * @throws {TypeError} If an invalid module name is provided.
 *
 * @returns {barney} Returns the `barney` module itself.
 *
 *
 * @also
 *
 *
 * Adds an interceptor to a specific module.
 *
 * @param {string} module
 * @param {Interceptor} value
 * @param {boolean} cache Cache must be **EXPLICITLY** set to `false`.
 *
 * @throws {TypeError} If an invalid module name is provided.
 * @throws {TypeError} if an invalid interceptor is provided.
 *
 * @returns {barney} Returns the `barney` module itself.
 */
exports.use = function (module, value, cache) {
  if (typeof module === 'function') {
    value = module;
    module = null;
  }

  if (arguments.length < 3) {
    cache = true;
  }

  if (module) {
    if (typeof value === 'function' && !cache) {
      exports.intercept(module, value);
    } else {
      exports.hook(module, value);
    }
  } else {
    exports.intercept(value);
  }

  return exports;
};


/**
 * Hooks into the `require()` function.
 * @returns {barney} Returns the `barney` module itself.
 *
 * @also
 *
 * Adds a hook to the given module.
 *
 * @param {string} module
 * @param {*} value The value to be returned when `require`-ing the module.
 * Beware that returning a falsy value will cause the hook to be ignored.
 *
 * @returns {barney} Returns the `barney` module itself.
 */
exports.hook = function (module, value) {
  if (!arguments.length) {
    // Hook into `require()`
    Module._load = hookedLoadMethod;
  } else {
    if (typeof module !== 'string') {
      throw new TypeError('Invalid module');
    }

    hooks[resolve(module)] = value;
  }

  return exports;
};


/**
 * Adds a generic interceptor (called by every call to `require()`).
 *
 * @param {Interceptor} interceptor
 * @param {number} [index] Index at which the interceptor should be added.
 *
 * @throws {TypeError} If an invalid interceptor is provided
 *
 * @returns {barney}
 *
 *
 * @also
 *
 *
 * Adds an interceptor for a specific module.
 *
 * @param {string} module
 * @param {Interceptor} interceptor
 * @param {number} [index] Index at which the interceptor should be added.
 *
 * @throws {TypeError} If an invalid module is provided.
 * @throws {TypeError} If an invalid interceptor is provided.
 *
 * @returns {barney}
 */
exports.intercept = function (module, interceptor, index) {
  if (arguments.length < 3 && typeof module === 'function') {
    index = interceptor;
    interceptor = module;
    module = null;
  }

  if (typeof interceptor !== 'function') {
    throw new TypeError('Invalid interceptor');
  }

  if (module) {
    addModuleInterceptor(module, interceptor, index);
  } else {
    addInterceptor(interceptor, index);
  }

  return exports;
};


/**
 * Removes all hooks and interceptors.
 * @returns {barney}
 *
 * @also
 *
 * Removes all hooks and interceptors for a specific module.
 *
 * @param {string} module
 * @returns {barney}
 */
exports.reset = function (module) {
  var resolved;

  if (module) {
    resolved = resolve(module);
    delete hooks[resolved];
    delete moduleInterceptors[resolved];
  } else {
    hooks = {};
    interceptors = [];
    moduleInterceptors = {};
  }

  return exports;
};


/**
 * Deactivates the barney module. This does **not** remove hooks nor
 * interceptors, it just restores the original loader function.
 * @see {@link .reset}
 * @see {@link .hook}
 * @returns {barney}
 */
exports.restore = function () {
  Module._load = originalLoadMethod;
  return exports;
};

/**
 * @alias .restore
 */
exports.unhook = exports.restore;


/**
 * Removes the cached module value from node's cache.
 * @param module
 * @returns {barney}
 */
exports.unload = function (module) {
  delete require.cache[resolve(module)];
  return exports;
};

/**
 * Checks if barney is active.
 * @returns {boolean}
 */
exports.isActive = function () {
  return Module._load === hookedLoadMethod;
};


/**
 * Throws a `module not found` error. Just a helper for simulating missing
 * modules, e.g.:
 *
 *     barney.intercept('foo', barney.notFound);
 *
 */
exports.notFound = function () {
  var err = new Error('Module not found');
  err.code = 'MODULE_NOT_FOUND';
  throw err;
};


exports.hook();



// HELPERS /////////////////////////////////////////////////////////////////////

/** @private */
function addModuleInterceptor(module, interceptor, index) {
  var resolved = resolve(module);
  var interceptors = moduleInterceptors[resolved];

  if (!interceptors) {
    interceptors = moduleInterceptors[resolved] = [];
  }

  addInterceptor(interceptors, interceptor, index);
}


/** @private */
function addInterceptor(list, interceptor, index) {
  if (typeof list === 'function') {
    index = interceptor;
    interceptor = list;
    list = null;
  }

  list = list || interceptors;

  if (list.indexOf(interceptor) === -1) {
    if (index || index === 0) {
      list.splice(index, 0, interceptor);
    } else {
      list.push(interceptor);
    }
  }
}


/** @private */
function intercept(list, args) {
  var i, len, val;

  if (list) {
    len = list.length;
    for (i = 0; i < len; i += 1) {
      val = list[i].apply(null, args);
      if (val) { return val; }
    }
  }
}


/** @private */
function resolve(module) {
  try {
    return require.resolve(module);
  } catch (err) {
    // As long as `module` is a string, this should be the only
    // error thrown by `require.resolve()`
    /* istanbul ignore else */
    if (err.code === 'MODULE_NOT_FOUND') {
      return module;
    } else {
      throw err;
    }
  }
}
