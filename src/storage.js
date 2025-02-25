/* global chrome */

// Modern promisify using async/await
function promisify(chromeFunc) {
  return async (keys) => {
    return new Promise((resolve, reject) => {
      chromeFunc(keys, (result) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(err);
        } else {
          resolve(result || {});
        }
      });
    });
  };
}

// Use const instead of window properties
const getSyncStorage = promisify(chrome.storage.sync.get.bind(chrome.storage.sync));
const setSyncStorage = promisify(chrome.storage.sync.set.bind(chrome.storage.sync));

// Use async/await for cleaner promise handling
async function setStorage(contributor, orgRepoPath, value) {
  try {
    return await setSyncStorage({
      [`${contributor}|${orgRepoPath}`]: value
    });
  } catch (e) {
    if (e.message === "MAX_ITEMS quota exceeded") {
      const { access_token } = await getSyncStorage({ "access_token": null });
      if (access_token) {
        await new Promise(resolve => chrome.storage.sync.clear(resolve));
        await setSyncStorage({ "access_token": access_token });
      }
    }
  }
}

async function getStorage(contributor, orgRepoPath) {
  return getSyncStorage(`${contributor}|${orgRepoPath}`);
}

// Export functions properly
window.getSyncStorage = getSyncStorage;
window.setSyncStorage = setSyncStorage;
window.setStorage = setStorage;
window.getStorage = getStorage;
