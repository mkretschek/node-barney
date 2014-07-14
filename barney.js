
(function () {
  'use strict';

  var Module = require('module');

  var originalLoadMethod = Module._load;

  var hooks = [];

  var barney = {};
  exports = module.exports = barney;


  barney.hook = function (fn) {
    if (!~hooks.indexOf(fn)) {
      hooks.push(fn);
    }

    return this;
  };


  barney.enable = function () {
    Module._load = function (request, parent, isMain) {
      var len, i, result;

      for (i = 0, len = hooks.length; i < len; i += 1) {
        result = hooks[i].call(Module, request, parent, isMain);
        if (result !== undefined) {
          return result;
        }
      }

      return originalLoadMethod.call(Module, request, parent, isMain);
    };
  };


  barney.disable = function () {
    Module._load = originalLoadMethod;
  };


  barney.unhook = function (fn) {
    if (fn) {
      var index = hooks.indexOf(fn);
      if (~index) {
        hooks.splice(index, 1);
      }
    } else {
      hooks.length = 0;
    }

    return this;
  };


  barney.clear = barney.unhook;


  barney.moduleNotFound = function (message) {
    message = message || 'Module not found';

    var err = new Error(message);
    err.code = 'MODULE_NOT_FOUND';

    throw(err);
  };


  barney.unload = function (module, resolve) {
    if (arguments.length === 1) {
      resolve = true;
    }

    if (resolve) {
      module = Module._resolveFilename(module);
    }

    delete Module._cache[module];
  };

})();
