/* global getSyncStorage, setSyncStorage, getTokenFromOauth */

document.addEventListener("DOMContentLoaded", async () => {
  const accessTokenInput = document.getElementById("token-input");
  const oauthLink = document.getElementById("use-oauth");
  const clearCacheLink = document.getElementById("clear-cache");
  const showPrivateReposInput = document.getElementById("show-private-repos");
  const feedback = document.querySelector("#feedback");

  // Show feedback messages
  function showFeedback(message) {
    if (feedback) {
      feedback.textContent = message;
      feedback.style.display = "block";
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        feedback.style.display = "none";
      }, 3000);
    }
  }

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
  oauthLink.addEventListener("click", () => {
    getTokenFromOauth();
  });

  // Clear cache button click handler
  clearCacheLink.addEventListener("click", async () => {
    try {
      const temp = accessTokenInput.value;
      await new Promise(resolve => chrome.storage.sync.clear(resolve));
      await setSyncStorage({ "access_token": temp });
      showFeedback("Storage Cleared");
    } catch (error) {
      showFeedback(`Error clearing storage: ${error.message}`);
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

