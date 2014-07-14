/**
 * Allows to customize the module-loading process by adding hooks to the
 * module package's methods.
 */
(function () {
  'use strict';

  var Module = require('module');

  var originalLoadMethod = Module._load;


  /**
   * A function that customizes the module-loading process. It accepts the
   * same arguments as {@code Module._load()}.
   *
   * @typedef {function(request, parent, isMain)} HookFunction
   *
   * @param {string} request The value passed to {@code request()}.
   * @param {module=} parent A reference to the module object in which 
   *  {@code request()} was called.
   * @param {boolean=} isMain Indicates if this is the main module, setting
   *  {@code process.mainModule} if true.
   *
   * @return {*} If a value other than {@code undefined} is returned, it
   *  will be the value returned by the {@code require()} call and no
   *  further hooks will be executed.
   */

  /**
   * Array of hook functions that should be called before falling back
   * to the original load method.
   * @type {array.<HookFunction>}
   */
  var hooks = [];


  var barney = {};
  exports = module.exports = barney;


  /**
   * Adds a hook function to the list of hooks. When {@code require()} is
   * called, the hooks will be executed in the order they've been added to
   * the list. If a hook returns a value, this value is used as it had been
   * exported by the required module and no further hooks are executed.
   *
   * If the hook returns {@code undefined} the next hook is called. After all
   * hooks have been executed, if none of them returned a value, falls back to
   * the original load function.
   *
   * @param {HookFunction} hook Function to be added to the hooks stack.
   *
   * @return {object} The barney object itself (allows chaining).
   */
  barney.hook = function (fn) {
    if (!~hooks.indexOf(fn)) {
      hooks.push(fn);
    }

    return this;
  };


  /**
   * Activates the hooks. This allows the custom loading behavior to be
   * enabled and disabled just when really needed.
   *
   * @return {object} The barney object itself (allows chaining).
   */
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

    return this;
  };


  /**
   * Disables the hooks, restoring the original load function.
   *
   * @return {object} The barney object itself (allows chaining).
   */
  barney.disable = function () {
    Module._load = originalLoadMethod;
    return this;
  };


  /**
   * Removes the given hook function from the hook list. If called without
   * arguments, clears the hook list.
   *
   * @param {HookFunction=} hook Hook function to be removed.
   *
   * @return {object} The barney object itself (allows chaining).
   */
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


  /** @alias barney.unhook */
  barney.clear = barney.unhook;


  /**
   * Helper function for throwing module not found errors when simulating
   * missing modules. The thrown error will have its code set to
   * 'MODULE_NOT_FOUND'.
   *
   * @param {string=} message Error's message.
   */
  barney.moduleNotFound = function (message) {
    message = message || 'Module not found';

    var err = new Error(message);
    err.code = 'MODULE_NOT_FOUND';

    throw(err);
  };


  /**
   * A helper for removing a module from the cache, forcing it to be reloaded
   * the next time it's required.
   *
   * @param {string} module Name or path to the module that should be
   *  unloaded.
   *
   * @param {boolean=} resolve If set to true (default), the module's name
   *  or path will be resolved before removing it from the cache. This is
   *  necessary to resolve paths to the right module. But, if you've hooked
   *  a mockup or expect the module to be missing, set this to false to
   *  avoid the module name resolution.
   *
   * @return {object} The barney object itself (allows chaining).
   */
  barney.unload = function (module, resolve) {
    if (arguments.length === 1) {
      resolve = true;
    }

    if (resolve) {
      module = Module._resolveFilename(module);
    }

    delete Module._cache[module];

    return this;
  };

})();
