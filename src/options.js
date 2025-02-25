/* global getSyncStorage, setSyncStorage, clearAllStorage, STORAGE_KEYS */

/**
 * Contributors on GitHub - Options Page
 * Handles the options page functionality for the extension
 */

// Local storage prefix for contributor data
const CACHE_PREFIX = "gce-cache-";

document.addEventListener("DOMContentLoaded", async () => {
  // DOM elements
  const elements = {
    accessTokenInput: document.getElementById("token-input"),
    clearCacheButton: document.getElementById("clear-cache"),
    showPrivateReposInput: document.getElementById("show-private-repos"),
    feedbackElement: document.getElementById("feedback"),
    githubTokenLink: document.getElementById("gh-token-link")
  };
  
  /**
   * Shows feedback message to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message (success, error, warning)
   */
  function showFeedback(message, type = 'success') {
    if (!elements.feedbackElement) return;
    
    elements.feedbackElement.textContent = message;
    elements.feedbackElement.style.display = "block";
    
    // Reset classes
    elements.feedbackElement.className = "feedback";
    elements.feedbackElement.classList.add(type);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      elements.feedbackElement.style.display = "none";
    }, 3000);
  }
  
  /**
   * Validates a GitHub token by making a test API call
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} - Whether the token is valid
   */
  async function validateToken(token) {
    if (!token) return false;
    
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      
      return response.status !== 401 && response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
  
  /**
   * Saves the access token after validation
   */
  async function saveToken() {
    try {
      const token = elements.accessTokenInput.value.trim();
      
      // If token is provided, validate it
      if (token) {
        showFeedback("Validating token...");
        const isValid = await validateToken(token);
        
        if (!isValid) {
          showFeedback("Invalid token. Please check your token and try again.", "error");
          return;
        }
      }
      
      await setSyncStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: token });
      showFeedback("Token saved successfully");
    } catch (error) {
      showFeedback(`Error saving token: ${error.message}`, "error");
    }
  }
  
  /**
   * Clears only the contributor data cache from localStorage
   */
  function clearContributorCache() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      showFeedback("Contributor data cache cleared successfully");
    } catch (error) {
      showFeedback(`Error clearing cache: ${error.message}`, "error");
    }
  }
  
  /**
   * Saves the "show private repos" setting
   */
  async function savePrivateReposSetting() {
    try {
      await setSyncStorage({ 
        [STORAGE_KEYS.SHOW_PRIVATE_REPOS]: elements.showPrivateReposInput.checked 
      });
      showFeedback("Setting saved");
    } catch (error) {
      showFeedback(`Error saving setting: ${error.message}`, "error");
    }
  }
  
  /**
   * Initialize the options page
   */
  async function initOptions() {
    // Load saved settings
    try {
      const settings = await getSyncStorage({ 
        [STORAGE_KEYS.ACCESS_TOKEN]: null, 
        [STORAGE_KEYS.SHOW_PRIVATE_REPOS]: false
      });
      
      if (settings[STORAGE_KEYS.ACCESS_TOKEN]) {
        elements.accessTokenInput.value = settings[STORAGE_KEYS.ACCESS_TOKEN];
      }
      
      elements.showPrivateReposInput.checked = !!settings[STORAGE_KEYS.SHOW_PRIVATE_REPOS];
    } catch (error) {
      showFeedback(`Error loading settings: ${error.message}`, "error");
    }
    
    // Set up event listeners
    elements.accessTokenInput.addEventListener("change", saveToken);
    elements.clearCacheButton.addEventListener("click", clearContributorCache);
    elements.showPrivateReposInput.addEventListener("change", savePrivateReposSetting);
    
    // Make the GitHub token link work
    if (elements.githubTokenLink) {
      elements.githubTokenLink.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: elements.githubTokenLink.getAttribute("href") });
      });
    }
  }
  
  // Initialize the options page
  initOptions();
});

