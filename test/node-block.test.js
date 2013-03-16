var assert = require('assert');
var fs = require('fs');
var path = require('path');
var block = require('../lib/node-block.js').block;

var fileA = path.join(__dirname, 'rsc', '_a.txt'); // aaaa
var fileB = path.join(__dirname, 'rsc', '_b.txt'); // bbbb

describe('node-block', function() {

  it('sync chain', function(done) {
    block(
      function() {
        this.data.d1 = 'a';
      },
      function() {
        this.data.d1 += 'b';
      },
      function() {
        assert.equal(this.data.d1, 'ab');
      }
    )(done);
  });

  it('async chain serial', function(done) {
    block(
      function() {
        fs.readFile(fileA, 'utf8', this.async('d1'));
      },
      function() {
        fs.readFile(fileB, 'utf8', this.async('d2'));
      },
      function() {
        var str = this.data.d1 + this.data.d2;
        assert.equal(str, 'aaaabbbb');
      }
    )(done);
  });

  it('async chain parallel', function(done) {
    block(
      function() {
        fs.readFile(fileA, 'utf8', this.async('d1'));
        fs.readFile(fileB, 'utf8', this.async('d2'));
      },
      function() {
        fs.readFile(fileA, 'utf8', this.async('d3'));
        fs.readFile(fileB, 'utf8', this.async('d4'));
      },
      function() {
        var str = this.data.d1 + this.data.d2 + this.data.d3 + this.data.d4;
        assert.equal(str, 'aaaabbbbaaaabbbb');
      }
    )(done);
  });

  it('async parallel set time', function(done) {
    block(
      function() {
        this.data.d1 = '';
        var that = this;
        var cb1 = this.async();
        setTimeout(function() {
          that.data.d1 += 'a';
          cb1();
        }, 40);
        var cb2 = this.async();
        setTimeout(function() {
          that.data.d1 += 'b';
          cb2();
        }, 20);
        var cb3 = this.async();
        setTimeout(function() {
          that.data.d1 += 'c';
          cb3();
        }, 1);
      },
      function() {
        assert.equal(this.data.d1, 'cba');
      }
    )(done);
  });

  it('async chain no delay', function(done) {
    block(
      function() {
        this.async('d1')(null, 'a');
      },
      function() {
        this.async('d2')(null, 'b');
      },
      function() {
        var str = this.data.d1 + this.data.d2;
        assert.equal(str, 'ab');
      }
    )(done);
  });

  it('no exception', function(done) {
    block(
      function() {
        this.data.d1 = 'a';
      },
      function() {
        this.data.d1 += 'b';
      },
      function cat(err) {
        this.data.d1 += 'c';
      },
      function fin() {
        assert.equal(this.data.d1, 'ab');
      }
    )(done);
  });

  it('throw exception', function(done) {
    block(
      function() {
        this.data.d1 = 'a';
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.equal(this.data.d1, 'a');
        assert.equal(err.message, 'test');
      }
    )(done);
  });

  it('throw exception and async', function(done) {
    block(
      function() {
        this.data.d1 = 'a';
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.equal(this.data.d1, 'a');
        assert.equal(err.message, 'test');
        fs.readFile(fileA, 'utf8', this.async('d2'));
        fs.readFile(fileB, 'utf8', this.async('d3'));
      }
    )(function(err) {
      var str = this.data.d2 + this.data.d3;
      assert.equal(str, 'aaaabbbb');
      assert.equal(err, null);
      done();
    });
  });

  it('throw exception from async', function(done) {
    block(
      function() {
        fs.readFile('not_found', 'utf8', this.async('d1'));
      },
      function() {
        assert(false, 'assert');
      },
      function cat(err) {
        assert.notEqual(err.message, 'assert');
        assert.notEqual(err, null);
      }
    )(done);
  });

  it('throw exception from async parallel', function(done) {
    block(
      function() {
        fs.readFile('not_found', 'utf8', this.async('d1'));
        fs.readFile('not_found', 'utf8', this.async('d2'));
        fs.readFile('not_found', 'utf8', this.async('d3'));
      },
      function() {
        assert(false, 'assert');
      },
      function cat(err) {
        assert.notEqual(err.message, 'assert');
        assert.notEqual(err, null);
      }
    )(done);
  });

  it('throw exception from inner block', function(done) {
    block(
      function() {
        block(
          function() {
            ;
          },
          function() {
            throw new Error('test');
          },
          function() {
            assert(false);
          }
        )(this.async());
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.equal(err.message, 'test');
      }
    )(done);
  });

  it('catch exception and throw', function(done) {
    block(
      function() {
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
        throw err;
      },
      function fin(err) {
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
      }
    )(function(err) {
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('catch exception and throw async', function(done) {
    block(
      function() {
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
        this.data.d1 = 'b';
        fs.readFile(fileA, 'utf8', this.async('d1'));
        throw err;
      },
      function fin(err) {
        assert.equal(this.data.d1, 'b'); // d1 is not 'aaaa'. It's because cat() throws a err immediately.
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
      }
    )(function(err) {
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('no catch exception', function(done) {
    block(
      function() {
        throw new Error('test');
      },
      function() {
        assert(false);
      }
    )(function(err) {
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('no catch exception and fin', function(done) {
    block(
      function() {
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function fin(err) {
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
      }
    )(function(err) {
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('no catch exception and fin async', function(done) {
    block(
      function() {
        throw new Error('test');
      },
      function() {
        assert(false);
      },
      function fin(err) {
        assert.notEqual(err, null);
        assert.equal(err.message, 'test');
        fs.readFile(fileA, 'utf8', this.async('d1'));
        fs.readFile(fileB, 'utf8', this.async('d2'));
      }
    )(function(err) {
      var str = this.data.d1 + this.data.d2;
      assert.equal(str, 'aaaabbbb');
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('default callback', function(done) {
    block(
      function() {
        block(
          function() {
            throw new Error('test');
          },
          function cat(err) {
            throw err;
          },
          function fin() {
            ;
          }
        )();
      },
      function() {
        assert(false);
      }
    )(function(err) {
      assert.notEqual(err, null);
      done((err.message == 'test') ? null : err);
    });
  });

  it('jump to end', function(done) {
    block(
      function() {
        this.data.d1 = 'a';
        if (true) {
          return this.end();
        }
        assert(false);
      },
      function() {
        assert(false);
      },
      function cat(err) {
        assert.notEqual(err, null);
        throw err;
      },
      function fin(err) {
        assert.equal(err, null);
        this.data.d1 += 'b';
      }
    )(function(err) {
      assert.equal(this.data.d1, 'ab');
      done(err);
    });
  });

  it('nested block', function(done) {
    block(
      function() {
        fs.readFile(fileA, 'utf8', this.async('d1'));
        fs.readFile(fileB, 'utf8', this.async('d2'));
      },
      function() {
        fs.readFile(fileA, 'utf8', this.async('d3'));
        block(
          function() {
            fs.readFile(fileB, 'utf8', this.async('e1'));
            fs.readFile(fileA, 'utf8', this.async('e2'));
          },
          function() {
            fs.readFile(fileB, 'utf8', this.async('e3'));
          }
        )(this.async('d4'));
      },
      function() {
        var str = this.data.d1 + this.data.d2 + this.data.d3 +
          this.data.d4.e1 + this.data.d4.e2 + this.data.d4.e3;
        assert.equal(str, 'aaaabbbbaaaabbbbaaaabbbb');
      }
    )(done);
  });

  it('nested and parallel block', function(done) {
    block(
      function() {
        fs.readFile(fileA, 'utf8', this.async('d1'));
        fs.readFile(fileB, 'utf8', this.async('d2'));
      },
      function() {
        fs.readFile(fileA, 'utf8', this.async('d3'));
        block(
          function() {
            fs.readFile(fileB, 'utf8', this.async('e1'));
            fs.readFile(fileA, 'utf8', this.async('e2'));
          },
          function() {
            fs.readFile(fileB, 'utf8', this.async('e3'));
          }
        )(this.async('d4'));
        block(
          function() {
            fs.readFile(fileA, 'utf8', this.async('e1'));
          },
          function() {
            fs.readFile(fileB, 'utf8', this.async('e2'));
            fs.readFile(fileA, 'utf8', this.async('e3'));
          }
        )(this.async('d5'));
      },
      function() {
        var str = this.data.d1 + this.data.d2 + this.data.d3 +
          this.data.d4.e1 + this.data.d4.e2 + this.data.d4.e3 +
          this.data.d5.e1 + this.data.d5.e2 + this.data.d5.e3;
        assert.equal(str, 'aaaabbbbaaaabbbbaaaabbbbaaaabbbbaaaa');
      }
    )(done);
  });

  it('bench', function(done) {
    var loopCount = 10000;
    (function serialLoop() {
      if (loopCount-- <= 0) {
        done();
        return;
      }
      block(
        function() {
          setImmediate(this.async());
        },
        function() {
          setImmediate(this.async());
          setImmediate(this.async());
        },
        function() {
          setImmediate(this.async());
          setImmediate(this.async());
          setImmediate(this.async());
        },
        function() {
          setImmediate(this.async());
          setImmediate(this.async());
          setImmediate(this.async());
          setImmediate(this.async());
        }
      )(serialLoop);
    })();
  });

});
