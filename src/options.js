/* global getSyncStorage, setSyncStorage */

document.addEventListener("DOMContentLoaded", async () => {
  const accessTokenInput = document.getElementById("token-input");
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
    showFeedback(`Error loading settings: ${error.message}`, "error");
  }

  // Function to validate GitHub token
  async function validateToken(token) {
    if (!token) return false;
    
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      
      if (response.status === 401) {
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Helper function to show feedback in the options page
  function showFeedback(message, type = 'success') {
    const feedback = document.querySelector("#feedback");
    if (feedback) {
      feedback.textContent = message;
      feedback.style.display = "block";
      
      // Reset classes
      feedback.className = "feedback";
      
      // Add appropriate class based on type
      if (type === 'error') {
        feedback.classList.add('error');
      } else if (type === 'warning') {
        feedback.classList.add('warning');
      } else {
        feedback.classList.add('success');
      }
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        feedback.style.display = "none";
      }, 3000);
    }
  }

  // Save token when changed
  accessTokenInput.addEventListener("change", async () => {
    try {
      const token = accessTokenInput.value.trim();
      
      // If token is provided, validate it
      if (token) {
        showFeedback("Validating token...");
        const isValid = await validateToken(token);
        
        if (!isValid) {
          showFeedback("Invalid token. Please check your token and try again.", "error");
          return;
        }
      }
      
      await setSyncStorage({ "access_token": token });
      showFeedback("Token saved successfully");
    } catch (error) {
      showFeedback(`Error saving token: ${error.message}`, "error");
    }
  });

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
        // Validate token before restoring
        const isValid = await validateToken(token);
        if (isValid) {
          await setSyncStorage({ "access_token": token });
        } else {
          showFeedback("Your token appears to be invalid and was not restored.", "warning");
          return;
        }
      }
      
      showFeedback("Cache cleared successfully");
    } catch (error) {
      showFeedback(`Error clearing cache: ${error.message}`, "error");
    }
  });

  // Show private repos checkbox handler
  showPrivateReposInput.addEventListener("change", async () => {
    try {
      await setSyncStorage({ "_showPrivateRepos": showPrivateReposInput.checked });
      showFeedback("Setting saved");
    } catch (error) {
      showFeedback(`Error saving setting: ${error.message}`, "error");
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

