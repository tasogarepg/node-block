'use strict';

exports.block = block;

function block() {
  var funcs = Array.prototype.slice.call(arguments);
  var b = new BlockInfo(funcs);
  return b.start.bind(b);
}

function BlockInfo(funcs) {
  this.stepList = [];
  this.data = [];
  this.cat = null;
  this.fin = null;
  this.cb = null;
  var that = this;
  funcs.forEach(function(func) {
    var step = new StepInfo(that, that.stepList.length, func);
    that.stepList.push(step);
    if (func.name == 'cat') {
      that.cat = step;
      that.cat.func = function(err, data) {
        if (!err) return;
        func(err, data);
        this.errBaton = null;
      };
    } else if (func.name == 'fin') {
      that.fin = step;
    }
  });
}

BlockInfo.prototype.start = function(cb) {
  if (this.cb) {
    this.stepList.pop();
    this.cb = null;
  }
  if (cb) {
    this.cb = new StepInfo(this, this.stepList.length, cb);
    this.stepList.push(this.cb);
  }
  this.next(null, 0);
};

BlockInfo.prototype.next = function(err, stepIndex) {
  if (stepIndex >= this.stepList.length) {
    return;
  }
  var step = this.stepList[stepIndex];
  if (step.isDone) return;
  step.isDone = true;
  step.errBaton = err;
  step.nextLock = true;
  try {
    step.run();
  } catch (e) {
    step.end(e);
    return;
  }
  step.nextLock = false;
  if (step.asyncCount <= 0 && step.endCount == 0) {
    this.next(step.errBaton, step.stepIndex+1);
  }
};

BlockInfo.prototype.end = function(err) {
  err = err || null;
  if (err && this.cat && !this.cat.isDone) {
    this.next(err, this.cat.stepIndex);
  } else if (this.fin && !this.fin.isDone) {
    this.next(err, this.fin.stepIndex);
  } else if (this.cb && !this.cb.isDone) {
    this.next(err, this.cb.stepIndex);
  } else {
    if (err) throw err;
  }
};

function StepInfo(block, stepIndex, func) {
  this.block = block;
  this.stepIndex = stepIndex;
  this.asyncCount = 0;
  this.endCount = 0;
  this.isDone = false;
  this.nextLock = false;
  this.errBaton = null;
  this.data = block.data;
  this.func = func;
}

StepInfo.prototype.run = function() {
  this.func(this.errBaton, this.data);
};

StepInfo.prototype.end = function(err) {
  if (this.endCount++ === 0) {
    this.block.end(err);
  }
};

StepInfo.prototype.async = function(dataName) {
  this.asyncCount++;
  var that = new AsyncInfo(this, dataName);
  return function(err) {
    var step = that.step;
    var block = step.block;
    if (err) {
      step.end(err);
      return;
    }
    if (that.dataName) {
      var result = Array.prototype.slice.call(arguments, 1);
      if (result.length === 0) {
        block.data[that.dataName] = null;
      } else if (result.length === 1) {
        block.data[that.dataName] = result[0];
      } else {
        block.data[that.dataName] = result;
      }
    }
    step.asyncCount--;
    if (step.asyncCount <= 0 && !step.nextLock) {
      block.next(step.errBaton, step.stepIndex+1);
    }
  };
};

function AsyncInfo(step, dataName) {
  this.step = step;
  this.dataName = dataName || null;
}