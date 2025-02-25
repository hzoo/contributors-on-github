/* global chrome */

/**
 * Contributors on GitHub - Storage Utilities
 * Provides utilities for accessing and managing extension storage
 */

// Cache duration in milliseconds (7 days)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  SHOW_PRIVATE_REPOS: "_showPrivateRepos",
};

// Local storage prefix for contributor data
const CACHE_PREFIX = "gce-cache-";

/**
 * Gets settings from sync storage
 * @param {Object} keys - Object with keys to retrieve and default values
 * @returns {Promise<Object>} - Promise resolving to the retrieved settings
 */
function getSyncStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve(result || {});
      }
    });
  });
}

/**
 * Sets settings in sync storage
 * @param {Object} items - Object with keys and values to store
 * @returns {Promise<void>} - Promise resolving when storage is complete
 */
function setSyncStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Stores contributor data in localStorage
 * @param {string} contributor - The GitHub username of the contributor
 * @param {string} orgRepoPath - The organization or repository path
 * @param {Object} value - The data to store
 */
function setStorage(contributor, orgRepoPath, value) {
  try {
    // Create a unique key for this contributor and repo/org
    const cacheKey = `${contributor}|${orgRepoPath}`;
    
    // Store in local storage
    localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify({
      data: value,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error("Local storage error:", e);
    // Handle quota exceeded error
    if (e.message?.includes("quota")) {
      clearContributorCache();
    }
  }
}

/**
 * Gets contributor data from localStorage
 * @param {string} contributor - The GitHub username of the contributor
 * @param {string} orgRepoPath - The organization or repository path
 * @returns {Promise<Object>} - A promise that resolves with the stored data
 */
async function getStorage(contributor, orgRepoPath) {
  const cacheKey = `${contributor}|${orgRepoPath}`;
  
  try {
    const cachedData = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Check if cache is still valid
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
        return { [cacheKey]: parsed.data };
      }
    }
  } catch (e) {
    console.error("Local storage read error:", e);
  }
  
  // Return empty object if no valid data found
  return { [cacheKey]: {} };
}

/**
 * Clears only contributor data from localStorage
 */
function clearContributorCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error("Error clearing local storage:", e);
  }
}

/**
 * Clears all contributor data and optionally resets settings
 * @param {boolean} [preserveToken=true] - Whether to preserve the access token
 * @returns {Promise} - A promise that resolves when clearing is complete
 */
async function clearAllStorage(preserveToken = true) {
  // Clear contributor cache
  clearContributorCache();
  
  // Handle settings in sync storage
  if (preserveToken) {
    try {
      // Get current token before clearing
      const { access_token } = await getSyncStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: null });
      
      // Clear sync storage
      await new Promise((resolve, reject) => {
        chrome.storage.sync.clear(() => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Restore token if it exists
      if (access_token) {
        await setSyncStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: access_token });
      }
    } catch (e) {
      console.error("Error managing sync storage:", e);
    }
  } else {
    // Clear all sync storage without preserving anything
    await new Promise((resolve) => {
      chrome.storage.sync.clear(resolve);
    });
  }
}

// Export functions
window.getSyncStorage = getSyncStorage;
window.setSyncStorage = setSyncStorage;
window.setStorage = setStorage;
window.getStorage = getStorage;
window.clearAllStorage = clearAllStorage;
