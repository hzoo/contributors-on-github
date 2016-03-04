/* global chrome */

// chrome.storage.[sync|local|manage].get
// chrome.storage.[sync|local|manage].set
// chrome.storage.[sync|local|manage].getBytesInUse
// chrome.storage.[sync|local|manage].remove
// chrome.storage.[sync|local|manage].clear
// chrome.storage.onChanged

function promisify(func) {
  if (func && typeof func.then === "function") {
    return func;
  }

  return function(keys) {
    return new Promise(function (resolve, reject) {
      func(keys, function(arg1, arg2) {
        let err = chrome.runtime.lastError;
        if (err) {
          reject(err);
        } else {
          if (arg2) {
            resolve(arg1, arg2);
          } else if (arg1) {
            resolve(arg1);
          } else {
            resolve();
          }
        }
      });
    });
  };
}

window.promisify = promisify;
window.getSyncStorage = promisify(chrome.storage.sync.get.bind(chrome.storage.sync));
window.setSyncStorage = promisify(chrome.storage.sync.set.bind(chrome.storage.sync));
window.getLocalStorage = promisify(chrome.storage.local.get.bind(chrome.storage.local));
window.setLocalStorage = promisify(chrome.storage.local.set.bind(chrome.storage.sync));
