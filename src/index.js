var CreateSignalFactory = require('./CreateSignalFactory.js');
var CreateSignalStore = require('./CreateSignalStore.js');
var CreateRecorder = require('./CreateRecorder.js');
var Devtools = require('./Devtools.js');
var EventEmitter = require('events').EventEmitter;

module.exports = function (Model, defaultInput) {

  var controller = new EventEmitter();
  var model = Model(controller);
  var signals = {};
  var devtools = null;
  var signalStore = CreateSignalStore(signals, controller);

  if (typeof window !== 'undefined' && typeof window.addEventListener !== 'undefined') {
    devtools = Devtools(signalStore, controller);
  }

  var recorder = CreateRecorder(signalStore, signals, controller, model);
  var signalFactory = CreateSignalFactory(signalStore, recorder, devtools, controller, model, defaultInput);

  controller.signal = function () {
    signals[arguments[0]] = signalFactory.apply(null, arguments);
  };

  controller.signals = signals;
  controller.store = signalStore;
  controller.recorder = recorder;
  controller.get = function () {
    var path = !arguments.length ? [] : typeof arguments[0] === 'string' ? [].slice.call(arguments) : arguments[0];
    return model.get(path);
  }

  return controller;
};