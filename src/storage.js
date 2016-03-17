/* global chrome */

function promisify(func) {
  if (func && typeof func.then === "function") {
    return func;
  }

  return function(keys) {
    return new Promise(function (resolve, reject) {
      func(keys, function(arg) {
        let err = chrome.runtime.lastError;
        if (err) {
          reject(err);
        } else {
          if (arg) {
            resolve(arg);
          } else {
            resolve();
          }
        }
      });
    });
  };
}

window.getSyncStorage = promisify(chrome.storage.sync.get.bind(chrome.storage.sync));
window.setSyncStorage = promisify(chrome.storage.sync.set.bind(chrome.storage.sync));

window.setStorage = (CONTRIBUTOR, ORG_REPO_PATH, value) => {
  return window.setSyncStorage({
    [CONTRIBUTOR]: {
      [ORG_REPO_PATH]: value
    }
  });
};

window.setStorageProperty = (CONTRIBUTOR, ORG_REPO_PATH, prop, value) => {
  return window.setSyncStorage({
    [CONTRIBUTOR]: {
      [ORG_REPO_PATH]: {
        [prop]: value
      }
    }
  });
};

window.getStorage = (CONTRIBUTOR, ORG_REPO_PATH) => {
  return window.getSyncStorage({
    [CONTRIBUTOR]: {
      [ORG_REPO_PATH]: {}
    }
  });
};
