"use strict";

var events = (function() {

var EVENT_TYPE_PATTERN = /^on([A-Z]\w+$)/;
var gTargets = [];
var gListeners = [];

// Utility function to access given event `target` object's event listeners for
// the specific event `type`. If listeners for this type does not exists they
// will be created.
function observers(target, type) {
  if (!target) throw TypeError("Event target must be an object");
  var index = gTargets.indexOf(target);
  var listeners = {};
  if (index !== -1) {
    listeners = gListeners[index];
  } else {
    gTargets.push(target);
    gListeners.push(listeners);
  }
  return type in listeners ? listeners[type] : listeners[type] = [];
};

/**
 * Registers an event `listener` that is called every time events of
 * specified `type` is emitted on the given event `target`.
 * @param {Object} target
 *    Event target object.
 * @param {String} type
 *    The type of event.
 * @param {Function} listener
 *    The listener function that processes the event.
 */
function on(target, type, listener) {
  if (typeof(listener) !== 'function')
    throw new Error("The event listener must be a function.");

  var listeners = observers(target, type);
  if (!~listeners.indexOf(listener))
    listeners.push(listener);
}

/**
 * Execute each of the listeners in order with the supplied arguments.
 * All the exceptions that are thrown by listeners during the emit
 * are caught and can be handled by listeners of 'error' event. Thrown
 * exceptions are passed as an argument to an 'error' event listener.
 * If no 'error' listener is registered exception will be logged into an
 * error console.
 * @param {Object} target
 *    Event target object.
 * @param {String} type
 *    The type of event.
 * @params {Object|Number|String|Boolean} args
 *    Arguments that will be passed to listeners.
 */
function emit(target, type, ...args) {
  var state = observers(target, type);
  var listeners = state.slice();
  var count = listeners.length;
  var index = 0;

  // If error event and there are no handlers then print error message
  // into a console.
  if (count === 0 && type === 'error') console.exception(args[0]);
  while (index < count) {
    try {
      var listener = listeners[index];
      // Dispatch only if listener is still registered.
      if (~state.indexOf(listener))
        listener.apply(target, args);
    }
    catch (error) {
      // If exception is not thrown by a error listener and error listener is
      // registered emit `error` event. Otherwise dump exception to the console.
      if (type !== 'error') emit(target, 'error', error);
      else console.exception(error);
    }
    index++;
  }
   // Also emit on `"*"` so that one could listen for all events.
  if (type !== '*') emit(target, '*', type, ...args);
}

/**
 * Removes an event `listener` for the given event `type` on the given event
 * `target`. If no `listener` is passed removes all listeners of the given
 * `type`. If `type` is not passed removes all the listeners of the given
 * event `target`.
 * @param {Object} target
 *    The event target object.
 * @param {String} type
 *    The type of event.
 * @param {Function} listener
 *    The listener function that processes the event.
 */
function off(target, type, listener) {
  var length = arguments.length;
  if (length === 3) {
    var listeners = observers(target, type);
    var index = listeners.indexOf(listener);
    if (~index)
      listeners.splice(index, 1);
  }
  else if (length === 2) {
    observers(target, type).splice(0);
  }
  else if (length === 1) {
    var index = gTargets.indexOf(target);
    var listeners = {};
    if (index !== -1) {
      listeners = gListeners[index];
    } else {
      gTargets.push(target);
      gListeners.push(listeners);
    }
    Object.keys(listeners).forEach(function(type) {
      delete listeners[type];
    });
  }
}

return {
  on: on,
  off: off,
  emit: emit
}

})();
