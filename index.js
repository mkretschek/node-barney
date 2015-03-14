'use strict';

var Module = require('module');

var originalLoadMethod = Module._load;

var hooks = Object.create(null);
var interceptors = [];
var moduleInterceptors = {};

function hookedLoadMethod(request, parent, isMain) {
  var args = arguments;
  var resolved = resolve(request);

  return intercept(interceptors, args) ||
      intercept(moduleInterceptors[resolved], args) ||
      hooks[resolved] ||
      originalLoadMethod.apply(Module, args);
}

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

  return this;
};

exports.hook = function (module, value) {
  if (typeof module !== 'string') {
    throw new TypeError('Invalid module');
  }

  hooks[resolve(module)] = value;
  return this;
};


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

  return this;
};



exports.restore = function (module) {
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

  return this;
};

exports.activate = function () {
  Module._load = hookedLoadMethod;
  return this;
};

exports.deactivate = function () {
  Module._load = originalLoadMethod;
  return this;
};


exports.unload = function (module) {
  delete require.cache[resolve(module)];
  return this;
};

exports.isActive = function () {
  return Module._load === hookedLoadMethod;
};


exports.notFound = function () {
  var err = new Error('Module not found');
  err.code = 'MODULE_NOT_FOUND';
  throw(err);
};





exports.activate();




// HELPERS /////////////////////////////////////////////////////////////////////

function addModuleInterceptor(module, interceptor, index) {
  var resolved = resolve(module);
  var interceptors = moduleInterceptors[resolved];

  if (!interceptors) {
    interceptors = moduleInterceptors[resolved] = [];
  }

  addInterceptor(interceptors, interceptor, index);
}


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


function intercept(list, args) {
  var i, len, val;

  if (list) {
    for (i = 0, len = list.length; i < len; i += 1) {
      val = list[i].apply(null, args);
      if (val) return val;
    }
  }
}


function resolve(module) {
  try {
    return require.resolve(module);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return module;
    }

    throw err;
  }
}
