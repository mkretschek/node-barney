(function () {
  'use strict';

  var expect = require('chai').expect;
  var sinon = require('sinon');

  var barney = require('../');


  describe('barney', function () {
    var hook = sinon.spy();

    beforeEach(function () {
      hook.reset();

      barney
        .clear()
        .disable();
    });

    after(function () {
      barney.clear();
      barney.disable();
    });


    it('is accessible', function () {
      expect(barney).to.be.defined;
    });


    it('is an object', function () {
      expect(barney).to.be.an('object');
      expect(barney).not.to.be.empty;
    });


    describe('hook', function () {
      var hook2 = sinon.spy(function () {
        return 'foo';
      });


      beforeEach(function () {
        hook2.reset();

        barney
          .hook(hook)
          .enable();
      });

      it('is executed when a module is required', function () {
        expect(hook).not.to.have.been.called;
        require('./dummy');
        expect(hook).to.have.been.called;
      });


      it('is executed before accessing the cache', function () {
        // Make sure the dummy module is the cache
        var cache = require.cache[require.resolve('./dummy')];
        expect(cache).not.to.be.undefined;

        expect(hook).not.to.have.been.called;
        require('./dummy');
        expect(hook).to.have.been.called;
      });


      it('receives the value passed to require() as the first argument',
        function () {
          require('./dummy');
          expect(hook).to.have.been.calledWith('./dummy');
        });


      it('receives the parent module as the second argument', function () {
        require('./dummy');
        var parent = hook.lastCall.args[1];

        expect(parent.exports).to.equal('barney\'s test file');
      });


      it('does not executes the next hook when a hook returns a value',
        function () {
          barney
            .clear()
            .hook(hook2)
            .hook(hook);

          require('./dummy');

          expect(hook2).to.have.been.called;
          expect(hook).not.to.have.been.called;
        });


      it('returns the hook\'s return value as the result of require()',
        function () {
          barney
            .clear()
            .hook(hook2);

          expect(require('./dummy')).to.equal('foo');
        });


      it('executes the next hook if the hook does not return a value',
        function () {
          barney
            .clear()
            .hook(hook)
            .hook(hook2);

          require('./dummy');

          expect(hook).to.have.been.called;
          expect(hook2).to.have.been.called;
          expect(hook).to.have.been.calledBefore(hook2);
        });


      it('does not executes the next hook when a hook throws', function () {
        var hook2 = sinon.spy(function () {
          throw(new Error('An error'));
        });

        barney
          .clear()
          .hook(hook2)
          .hook(hook);

        try {
          require('./dummy');
        } catch (err) {
          expect(err.message).to.equal('An error');
        }

        expect(hook2).to.have.been.called;
        expect(hook).to.not.have.been.called;
      });
    }); // hook execution


    describe('#hook()', function () {
      it('is accessible', function () {
        expect(barney.hook).to.be.defined;
      });


      it('is a function', function () {
        expect(barney.hook).to.be.a('function');
      });


      it('adds a hook function to the hook list', function () {
        barney
          .hook(hook)
          .enable();

        expect(hook).not.to.have.been.called;
        require('./dummy');
        expect(hook.callCount).to.equal(1);
      });


      it('prevents the same hook from being added twice', function () {
        barney
          .hook(hook)
          .hook(hook)
          .enable();

        require('./dummy');
        expect(hook.callCount).to.equal(1);
      });


      it('allows chaining', function () {
        expect(barney.hook(hook)).to.equal(barney);
      });
    }); // #hook()


    describe('#unhook', function () {
      beforeEach(function () {
        barney
          .hook(hook)
          .enable();
      });

      it('is accessible', function () {
        expect(barney.unhook).to.be.defined;
      });


      it('is a function', function () {
        expect(barney.unhook).to.be.a('function');
      });


      it('removes the given function from the hook list', function () {
        require('./dummy');
        expect(hook).to.have.been.called;

        hook.reset();

        barney
          .unhook(hook);

        require('./dummy');
        expect(hook).not.to.have.been.called;
      });


      it('removes all hooks if called without arguments', function () {
        var hook2 = sinon.spy();
        barney.hook(hook2);

        require('./dummy');
        expect(hook).to.have.been.called.once;
        expect(hook2).to.have.been.called.once;

        hook.reset();
        hook2.reset();

        barney
          .unhook();

        require('./dummy');

        expect(hook).not.to.have.been.called;
        expect(hook2).not.to.have.been.called;
      });


      it('allows chaining', function () {
        expect(barney.unhook(hook)).to.equal(barney);
      });
    }); // #unhook()


    describe('#clear()', function () {
      it('aliases #unhook()', function () {
        expect(barney.clear).to.equal(barney.unhook);
      });
    }); // #clear()


    describe('#enable()', function () {
      it('is accessible', function () {
        expect(barney.enable).to.be.defined;
      });


      it('is a function', function () {
        expect(barney.enable).to.be.a('function');
      });


      it('enables the hooks on `require()` calls', function () {
        barney.hook(hook);

        require('./dummy');

        expect(hook).not.to.have.been.called;

        barney
          .enable();

        require('./dummy');

        expect(hook).to.have.been.called;
      });


      it('allows chaining', function () {
        expect(barney.enable()).to.equal(barney);
      });
    }); // #enable()


    describe('#disable()', function () {
      beforeEach(function () {
        barney
          .hook(hook)
          .enable();
      });


      it('is accessible', function () {
        expect(barney.disable).to.be.defined;
      });


      it('is a function', function () {
        expect(barney.disable).to.be.a('function');
      });


      it('disables the hooks on `require()` calls', function () {
        require('./dummy');
        expect(hook).to.have.been.called;

        barney
          .disable();

        hook.reset();

        require('./dummy');

        expect(hook).not.to.have.been.called;
      });


      it('does not clears the hook list', function () {
        barney.disable();

        require('./dummy');
        expect(hook).not.to.have.been.called;

        barney
          .enable();

        require('./dummy');

        expect(hook).to.have.been.called;
      });


      it('allows chaining', function () {
        expect(barney.disable()).to.equal(barney);
      });
    }); // #disable()


    describe('#moduleNotFound()', function () {
      it('is accessible', function () {
        expect(barney.moduleNotFound).to.be.defined;
      });


      it('is a function', function () {
        expect(barney.moduleNotFound).to.be.a('function');
      });


      it('throws a MODULE_NOT_FOUND error', function () {
        try {
          barney.moduleNotFound();
        } catch (err) {
          expect(err.code).to.equal('MODULE_NOT_FOUND');
        }
      });


      it('sets the given message on the thrown exception', function () {
        function throwMessage() {
          barney.moduleNotFound('Module was not found');
        }

        expect(throwMessage).to.throw('Module was not found');
      });
    }); // #moduleNotFound()

  }); // barney


  // Export something to make this a fake module (we'll need this
  // for the tests).
  exports = module.exports = 'barney\'s test file';
})();
