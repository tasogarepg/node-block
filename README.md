# node-block

An async control-flow library for Node.js.  
Easily parallel execution and error handling.  

## Installation

    $ npm install node-block

## Example

```js
var fs = require('fs');
var block = require('node-block.js').block;

block(
  function() {
    fs.readFile('/path/to/file1', 'utf8', this.async('d1'));
    fs.readFile('/path/to/file2', 'utf8', this.async('d2'));
  },
  function() {
    var str = this.data.d1 + this.data.d2;
    console.log(str);
  }
)();
```

### Error handling

Function name is `cat` and `fin`.

```js
var fs = require('fs');
var block = require('node-block.js').block;

block(
  function() {
    fs.readFile('/path/to/file1', 'utf8', this.async('d1'));
    fs.readFile('/path/to/file2', 'utf8', this.async('d2'));
  },
  function() {
    this.data.d3 = this.data.d1 + this.data.d2;
  },
  function cat(e) {       // catch
    console.log(e);
    throw e;
  },
  function fin() {        // finally
    console.log('fin');   // always run
  }
)();
```

### Jump to end

call `this.end()` with return.

```js
var fs = require('fs');
var block = require('node-block.js').block;

block(
  function() {
    if (true) {
      return this.end();  // called with return
    }
  },
  function() {
    // not run here.
  },
  function cat(e) {       // catch
    // when errorless, not run here.
  },
  function fin() {        // finally
    console.log('fin');
  }
)();
```

### Callback

sample() is called after fin().

```js
var fs = require('fs');
var block = require('node-block.js').block;

block(
  function() {
    fs.readFile('/path/to/file1', 'utf8', this.async('d1'));
  },
  function fin() {
    console.log('fin');
  }
)(sample);

function sample(err){
  if (err) throw err;
  console.log(this.data.d1);
}
```

### Nesting

```js
var fs = require('fs');
var block = require('node-block.js').block;

block(
  function() {
    fs.readFile('/path/to/file1', 'utf8', this.async('d1'));
    fs.readFile('/path/to/file2', 'utf8', this.async('d2'));
  },
  function() {
    fs.readFile('/path/to/file3', 'utf8', this.async('d3'));
    block(
      function() {
        fs.readFile('/path/to/file4', 'utf8', this.async('e1'));
        fs.readFile('/path/to/file5', 'utf8', this.async('e2'));
      },
      function() {
        fs.readFile('/path/to/file6', 'utf8', this.async('e3'));
      }
    )(this.async('d4'));
  },
  function() {
    var str = this.data.d1 + this.data.d2 + this.data.d3 +
      this.data.d4.e1 + this.data.d4.e2 + this.data.d4.e3;
    console.log(str);
  }
)();
```

## About API

### this.async([String dataName])
Make a callback for async function. [String dataName] is name of setting result data. It's named arbitrarily.  

### this.end([Error err])
Jump to end. If [Error err] is set jump to cat(), else jump to fin() or callback. If cat(), fin(), callback don't exist , exit block.  
This api must be called with 'return'.  

## License

The MIT License
