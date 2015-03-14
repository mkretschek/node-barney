'use strict';

/* jshint mocha:true, expr:true, maxstatements:30 */

var Module = require('module');

var path = require('path');
var chai = require('chai');
var sinon = require('sinon');

chai.use(require('sinon-chai'));

var expect = chai.expect;
var original = Module._load;

var barney = require('./');

var TEST_MODULE = './test/foo';
var TEST_MODULE_ALT = path.join(__dirname, 'test', 'foo');

var ORIGINAL_TEST_MODULE = require(TEST_MODULE);

describe('barney', function () {
  function reset() {
    barney.reset();
    barney.unload(TEST_MODULE);
  }

  beforeEach(function () {
    barney.hook();
  });

  beforeEach(reset);
  after(reset);
  after(barney.restore);

  it('is an object', function () {
    expect(barney).to.be.an('object');
  });

  it('is active by default', function () {
    expect(barney.isActive()).to.be.true;
  });

  describe('hook', function () {
    it('is a static value to be returned for the module', function () {
      var foo = {};

      barney.hook(TEST_MODULE, foo);

      var req1 = require(TEST_MODULE);
      var req2 = require(path.join(__dirname, 'test', 'foo'));

      expect(req1).to.equal(foo);
      expect(req2).to.equal(req1);
    });
  });


  describe('interceptor', function () {
    var interceptor;

    beforeEach(function () {
      interceptor = sinon.stub();
    });

    it('is a function called for every require (for a specific module)',
      function () {
        barney.intercept(TEST_MODULE, interceptor);

        expect(interceptor).to.not.have.been.called;

        require(TEST_MODULE);
        expect(interceptor).to.have.been.calledOnce;

        require(TEST_MODULE);
        expect(interceptor).to.have.been.calledTwice;
      });

    it('can set the value returned by the require', function () {
      var value = {};
      interceptor.returns(value);
      barney.intercept(TEST_MODULE, interceptor);
      expect(require(TEST_MODULE)).to.equal(value);
    });

    it('can keep the module\'s original value', function () {
      barney.intercept(TEST_MODULE, interceptor);
      expect(require(TEST_MODULE)).to.equal(ORIGINAL_TEST_MODULE);
    });
  });


  describe('API', function () {
    describe('.hook()', function () {
      it('is a function', function () {
        expect(barney.hook).to.be.a('function');
      });

      it('activates the barney module', function () {
        barney.restore();
        expect(barney.isActive()).to.be.false;
        barney.hook();
        expect(barney.isActive()).to.be.true;
      });

      it('replaces the original load function', function () {
        barney.restore();
        expect(Module._load).to.equal(original);
        barney.hook();
        expect(Module._load).to.not.equal(original);
      });

      it('allows chaining', function () {
        barney.restore();
        expect(barney.hook()).to.equal(barney);
      });
    });


    describe('.hook(module, value)', function () {
      it('is a function', function () {
        expect(barney.hook).to.be.a('function');
      });

      it('throws if module is not a string', function () {
        function invalidModule() {
          barney.hook(null, 'foo');
        }

        expect(invalidModule).to.throw('Invalid module');
      });

      it('sets a hooked value for the given module', function () {
        barney.hook(TEST_MODULE, 'foo');
        expect(require(TEST_MODULE)).to.equal('foo');
      });

      it('replaces existing hook', function () {
        var val1 = 'foo';
        var val2 = 'bar';

        barney.hook(TEST_MODULE, val1);
        expect(require(TEST_MODULE)).to.equal(val1);

        barney.hook(TEST_MODULE, val2);
        expect(require(TEST_MODULE)).to.equal(val2);
      });

      it('resolves module paths', function () {
        barney.hook(TEST_MODULE, 'foo');
        barney.hook(TEST_MODULE_ALT, 'bar');

        // Returns the hook set for TEST_MODULE_ALT
        expect(require(TEST_MODULE)).to.equal('bar');
      });

      it('caches value', function () {
        var foo = {};

        barney.hook(TEST_MODULE, foo);

        expect(require(TEST_MODULE)).to.equal(require(TEST_MODULE_ALT));
      });

      it('allows chaining', function () {
        expect(barney.hook('foo', 'bar')).to.equal(barney);
      });
    });


    describe('.intercept(interceptor)', function () {
      it('is a function', function () {
        expect(barney.intercept).to.be.a('function');
      });

      it('throws if interceptor is not a function', function () {
        function invalidInterceptor() {
          barney.intercept(null);
        }

        expect(invalidInterceptor).to.throw('Invalid interceptor');
      });

      it('sets an interceptor function', function () {
        var interceptor = sinon.stub();

        barney.intercept(interceptor);
        barney.hook('foo', 'foo');
        barney.hook('bar', 'bar');
        barney.hook('baz', 'baz');

        expect(interceptor).to.not.have.been.called;

        expect(require('foo')).to.equal('foo');
        expect(interceptor).to.have.been.calledOnce;

        expect(require('bar')).to.equal('bar');
        expect(interceptor).to.have.been.calledTwice;

        expect(require('baz')).to.equal('baz');
        expect(interceptor).to.have.been.calledThrice;
      });

      it('prevents duplicate interceptors', function () {
        var interceptor = sinon.stub();

        barney.intercept(interceptor);
        barney.intercept(interceptor);
        barney.intercept(interceptor);

        barney.hook('foo', 'foo');

        require('foo');
        expect(interceptor).to.have.been.calledOnce;
      });

      it('allows chaining', function () {
        expect(barney.intercept(function () {})).to.equal(barney);
      });
    });


    describe('.intercept(interceptor, index)', function () {
      it('is a function', function () {
        expect(barney.intercept).to.be.a('function');
      });

      it('adds the interceptor at the given index', function () {
        var interceptor1 = sinon.stub();
        var interceptor2 = sinon.stub();
        var interceptor3 = sinon.stub();
        var interceptor4 = sinon.stub();

        barney.hook('foo', 'bar');

        barney.intercept(interceptor1);
        barney.intercept(interceptor2);
        barney.intercept(interceptor3);

        require('foo');

        expect(interceptor1).to.have.been.calledBefore(interceptor2);
        expect(interceptor2).to.have.been.calledBefore(interceptor3);

        barney.intercept(interceptor4, 1);

        require('foo');
        expect(interceptor1).to.have.been.calledBefore(interceptor4);
        expect(interceptor4).to.have.been.calledBefore(interceptor2);
        expect(interceptor2).to.have.been.calledBefore(interceptor3);
      });

      it('prevents duplicate interceptors', function () {
        var interceptor1 = sinon.stub();
        var interceptor2 = sinon.stub();

        barney.intercept(interceptor1);
        barney.intercept(interceptor2, 0);
        barney.intercept(interceptor2, 0);

        barney.hook('foo', 'foo');

        require('foo');
        expect(interceptor2).to.have.been.calledOnce;
      });

      it('allows chaining', function () {
        expect(barney.intercept(function () {}, 0)).to.equal(barney);
      });
    });


    describe('.intercept(module, interceptor)', function () {
      it('is a function', function () {
        expect(barney.intercept).to.be.a('function');
      });

      it('adds an interceptor for a specific module', function () {
        var interceptor = sinon.stub();

        barney.hook('foo', 'foo');
        barney.hook('bar', 'bar');

        barney.intercept('foo', interceptor);

        expect(interceptor).not.to.have.been.called;

        require('bar');
        expect(interceptor).not.to.have.been.called;

        require('foo');
        expect(interceptor).to.have.been.calledOnce;
      });

      it('prevents duplicate interceptors', function () {
        var interceptor = sinon.stub();

        barney.intercept('foo', interceptor);
        barney.intercept('foo', interceptor);
        barney.intercept('foo', interceptor);

        barney.hook('foo', 'foo');

        require('foo');
        expect(interceptor).to.have.been.calledOnce;
      });

      it('allows chaining', function () {
        expect(barney.intercept('foo', function () {})).to.equal(barney);
      });
    });


    describe('.intercept(module, interceptor, index)', function () {
      it('is a function', function () {
        expect(barney.intercept).to.be.a('function');
      });

      it('adds an interceptor for a specific module at the given index',
        function () {
          var interceptor1 = sinon.stub();
          var interceptor2 = sinon.stub();
          var interceptor3 = sinon.stub();
          var interceptor4 = sinon.stub();

          barney.hook('foo', 'foo');
          barney.hook('bar', 'bar');

          barney.intercept('foo', interceptor1);
          barney.intercept('foo', interceptor2);
          barney.intercept('foo', interceptor3);

          require('bar');
          expect(interceptor1).not.to.have.been.called;
          expect(interceptor2).not.to.have.been.called;
          expect(interceptor3).not.to.have.been.called;
          expect(interceptor4).not.to.have.been.called;

          require('foo');

          expect(interceptor1).to.have.been.calledBefore(interceptor2);
          expect(interceptor2).to.have.been.calledBefore(interceptor3);

          barney.intercept('foo', interceptor4, 1);

          require('foo');
          expect(interceptor1).to.have.been.calledBefore(interceptor4);
          expect(interceptor4).to.have.been.calledBefore(interceptor2);
          expect(interceptor2).to.have.been.calledBefore(interceptor3);
        });

      it('prevents duplicate interceptors', function () {
        var interceptor1 = sinon.stub();
        var interceptor2 = sinon.stub();

        barney.intercept('foo', interceptor1);
        barney.intercept('foo', interceptor2, 0);
        barney.intercept('foo', interceptor2, 0);

        barney.hook('foo', 'foo');

        require('foo');
        expect(interceptor2).to.have.been.calledOnce;
      });

      it('allows chaining', function () {
        expect(barney.intercept('foo', function () {}, 0)).to.equal(barney);
      });
    });



    describe('.use(interceptor)', function () {

      function interceptor() {}

      it('is a function', function () {
        expect(barney.use).to.be.a('function');
      });

      it('passes the interceptor to .intercept()', function () {
        sinon.spy(barney, 'intercept');

        expect(barney.intercept).to.not.have.been.called;

        barney.use(interceptor);
        expect(barney.intercept).to.have.been.calledWith(interceptor);

        barney.intercept.restore();
      });

      it('allows chaining', function () {
        expect(barney.use(interceptor)).to.equal(barney);
      });
    });


    describe('.use(module, value)', function () {
      it('is a function', function () {
        expect(barney.use).to.be.a('function');
      });

      it('passes the module and the value to .hook()', function () {
        sinon.spy(barney, 'hook');

        expect(barney.hook).to.not.have.been.called;

        var foo = {};
        barney.use(TEST_MODULE, foo);

        expect(barney.hook).to.have.been.calledWith(TEST_MODULE, foo);

        barney.hook.restore();
      });

      it('allows chaining', function () {
        expect(barney.hook('foo', 'foobar')).to.equal(barney);
      });
    });

    describe('.use(module, value, cache)', function () {
      it('is a function', function () {
        expect(barney.use).to.be.a('function');
      });

      it('adds an interceptor if value is a function and cache is false',
        function () {
          function interceptor() {}

          sinon.spy(barney, 'intercept');

          expect(barney.intercept).to.not.have.been.called;

          barney.use(TEST_MODULE, interceptor, false);
          expect(barney.intercept).to.have.been.calledWith(
            TEST_MODULE,
            interceptor
          );

          barney.intercept.restore();
        });

      it('adds a hook if cache is true', function () {
        var hook = function () {};

        sinon.spy(barney, 'intercept');
        sinon.spy(barney, 'hook');

        barney.use(TEST_MODULE, hook, true);

        expect(barney.intercept).to.not.have.been.called;
        expect(barney.hook).to.have.been.calledWith(TEST_MODULE, hook);

        barney.intercept.restore();
        barney.hook.restore();
      });

      it('adds a hook if value is not a function', function () {
        var hook = 'foo';

        sinon.spy(barney, 'intercept');
        sinon.spy(barney, 'hook');

        barney.use(TEST_MODULE, hook, false);

        expect(barney.intercept).to.not.have.been.called;
        expect(barney.hook).to.have.been.calledWith(TEST_MODULE, hook);

        barney.intercept.restore();
        barney.hook.restore();
      });

      it('allows chaining', function () {
        expect(barney.use(TEST_MODULE, 'foo', true)).to.equal(barney);
      });
    });



    describe('.reset()', function () {
      it('is a function', function () {
        expect(barney.reset).to.be.a('function');
      });

      it('removes all interceptors', function () {
        var interceptorAll = sinon.stub();
        var interceptorFoo = sinon.stub();

        expect(interceptorAll).to.not.have.been.called;
        expect(interceptorFoo).to.not.have.been.called;

        barney.hook(TEST_MODULE, 'foo');

        barney.intercept(interceptorAll);

        barney.intercept(TEST_MODULE, interceptorAll);
        barney.intercept(TEST_MODULE, interceptorFoo);

        require(TEST_MODULE);
        expect(interceptorAll).to.have.been.calledTwice;
        expect(interceptorFoo).to.have.been.calledOnce;

        interceptorAll.reset();
        interceptorFoo.reset();

        barney.reset();

        require(TEST_MODULE);
        expect(interceptorAll).to.not.have.been.called;
        expect(interceptorFoo).to.not.have.been.called;
      });

      it('removes all hooks', function () {
        barney.hook('./package', 'package');
        barney.hook(TEST_MODULE, 'foo');

        expect(require('./package')).to.equal('package');
        expect(require(TEST_MODULE)).to.equal('foo');

        barney.reset();

        expect(require('./package')).not.to.equal('package');
        expect(require(TEST_MODULE)).to.equal(ORIGINAL_TEST_MODULE);
      });

      it('allows chaining', function () {
        expect(barney.reset()).to.equal(barney);
      });
    });


    describe('.reset(module)', function () {
      it('is a function', function () {
        expect(barney.reset).to.be.a('function');
      });

      it('removes all interceptors for the given module', function () {
        var interceptorAll = sinon.stub();
        var interceptorFoo = sinon.stub();

        expect(interceptorAll).to.not.have.been.called;
        expect(interceptorFoo).to.not.have.been.called;

        barney.intercept(interceptorAll);

        barney.intercept(TEST_MODULE, interceptorAll);
        barney.intercept(TEST_MODULE, interceptorFoo);

        require(TEST_MODULE);
        expect(interceptorAll).to.have.been.calledTwice;
        expect(interceptorFoo).to.have.been.calledOnce;

        interceptorAll.reset();
        interceptorFoo.reset();

        barney.reset(TEST_MODULE);

        require(TEST_MODULE);
        expect(interceptorAll).to.have.been.calledOnce;
        expect(interceptorFoo).to.not.have.been.called;
      });

      it('removes the hook value for the given module', function () {
        barney.hook('./package', 'package');
        barney.hook(TEST_MODULE, 'foo');

        expect(require('./package')).to.equal('package');
        expect(require(TEST_MODULE)).to.equal('foo');

        barney.reset(TEST_MODULE);

        expect(require('./package')).to.equal('package');
        expect(require(TEST_MODULE)).to.equal(ORIGINAL_TEST_MODULE);
      });

      it('allows chaining', function () {
        barney.hook('foo', 'bar');
        expect(barney.reset('foo')).to.equal(barney);
      });
    });


    describe('.restore()', function () {
      it('is a function', function () {
        expect(barney.restore).to.be.a('function');
      });

      it('restores the original load function', function () {
        expect(Module._load).to.not.equal(original);
        barney.restore();
        expect(Module._load).to.equal(original);
      });

      it('allows chaining', function () {
        expect(barney.restore()).to.equal(barney);
      });
    });


    describe('.isActive()', function () {
      it('is a function', function () {
        expect(barney.isActive).to.be.a('function');
      });

      it('returns true if while active', function () {
        barney.hook();
        expect(barney.isActive()).to.be.true;
      });

      it('returns false if not active', function () {
        barney.restore();
        expect(barney.isActive()).to.be.false;
      });
    });


    describe('.unload(module)', function () {
      it('is a function', function () {
        expect(barney.unload).to.be.a('function');
      });

      it('unloads a module cached by the original loader', function () {
        var foo1 = require('./test/bar');
        var foo2 = require('./test/bar');
        barney.unload('./test/bar');
        var foo3 = require('./test/bar');

        expect(foo1).to.equal(foo2);
        expect(foo1).not.to.equal(foo3);
      });

      it('allows chaining', function () {
        expect(barney.unload('./test/bar')).to.equal(barney);
      });
    });


    describe('.notFound()', function () {
      it('is a function', function () {
        expect(barney.notFound).to.be.a('function');
      });

      it('throws a module not found error', function () {
        var errOriginal;
        var errFake;

        try {
          require('foo');
        } catch (err) {
          errOriginal = err;
        }

        try {
          barney.notFound();
        } catch (err) {
          errFake = err;
        }

        expect(errOriginal).to.be.defined;
        expect(errFake).to.be.defined;

        expect(errOriginal.code).to.equal(errFake.code);
      });
    });

  });
});