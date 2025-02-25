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

// Simplified storage functions that use both sync storage and local caching
async function setStorage(contributor, orgRepoPath, value) {
  try {
    // Use local storage for caching contributor data
    const cacheKey = `${contributor}|${orgRepoPath}`;
    
    // Store in local storage for faster access
    try {
      localStorage.setItem(`gce-cache-${cacheKey}`, JSON.stringify({
        data: value,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Local storage error:", e);
    }
    
    // Also store in sync storage as backup
    return await setSyncStorage({
      [cacheKey]: value
    });
  } catch (e) {
    console.error("Sync storage error:", e);
    if (e.message === "MAX_ITEMS quota exceeded") {
      try {
        const { access_token } = await getSyncStorage({ "access_token": null });
        if (access_token) {
          // In MV3, we need to use clear() with a Promise
          await new Promise(resolve => chrome.storage.sync.clear(resolve));
          await setSyncStorage({ "access_token": access_token });
        }
      } catch (clearError) {
        console.error("Failed to clear storage:", clearError);
      }
    }
  }
}

// Get data from storage with caching
async function getStorage(contributor, orgRepoPath) {
  const cacheKey = `${contributor}|${orgRepoPath}`;
  
  // Try to get from local storage first (faster)
  try {
    const cachedData = localStorage.getItem(`gce-cache-${cacheKey}`);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Check if cache is less than 1 hour old
      if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.error("Local storage read error:", e);
  }
  
  // Fall back to sync storage
  try {
    const result = await getSyncStorage({ [cacheKey]: null });
    return result[cacheKey] || {};
  } catch (e) {
    console.error("Sync storage read error:", e);
    return null;
  }
}

// Export functions properly
window.getSyncStorage = getSyncStorage;
window.setSyncStorage = setSyncStorage;
window.setStorage = setStorage;
window.getStorage = getStorage;
