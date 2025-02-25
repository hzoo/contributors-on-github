/* global getSyncStorage, setSyncStorage, getTokenFromOauth, showFeedback */

document.addEventListener("DOMContentLoaded", async () => {
  const accessTokenInput = document.getElementById("token-input");
  const oauthLink = document.getElementById("use-oauth");
  const clearCacheLink = document.getElementById("clear-cache");
  const showPrivateReposInput = document.getElementById("show-private-repos");
  
  // Load saved settings
  try {
    const { access_token, _showPrivateRepos } = await getSyncStorage({ 
      "access_token": null, 
      "_showPrivateRepos": null 
    });
    
    if (access_token) accessTokenInput.value = access_token;
    if (_showPrivateRepos) showPrivateReposInput.checked = _showPrivateRepos;
  } catch (error) {
    showFeedback(`Error loading settings: ${error.message}`);
  }

  // Save token when changed
  accessTokenInput.addEventListener("change", async () => {
    try {
      await setSyncStorage({ "access_token": accessTokenInput.value });
      showFeedback("Token saved");
    } catch (error) {
      showFeedback(`Error saving token: ${error.message}`);
    }
  });

  // OAuth button click handler
  oauthLink.addEventListener("click", getTokenFromOauth);

  // Clear cache button click handler
  clearCacheLink.addEventListener("click", async () => {
    try {
      // Save token before clearing
      const token = accessTokenInput.value;
      
      // Clear both sync storage and local cache
      await new Promise(resolve => chrome.storage.sync.clear(resolve));
      
      // Clear local storage cache
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('gce-cache-')) {
          localStorage.removeItem(key);
        }
      }
      
      // Restore token if it existed
      if (token) {
        await setSyncStorage({ "access_token": token });
      }
      
      showFeedback("Cache cleared successfully");
    } catch (error) {
      showFeedback(`Error clearing cache: ${error.message}`);
    }
  });

  // Show private repos checkbox handler
  showPrivateReposInput.addEventListener("change", async () => {
    try {
      await setSyncStorage({ "_showPrivateRepos": showPrivateReposInput.checked });
      showFeedback("Setting saved");
    } catch (error) {
      showFeedback(`Error saving setting: ${error.message}`);
    }
  });
  
  // Make the GitHub token link work
  const ghLink = document.getElementById("gh_link");
  if (ghLink) {
    ghLink.addEventListener("click", () => {
      chrome.tabs.create({ url: ghLink.getAttribute("href") });
    });
  }
});

