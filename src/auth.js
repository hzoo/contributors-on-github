/* global chrome, queryString, getSyncStorage, setSyncStorage */

const CLIENT_ID = "1a3ac4d44a9e65a75a77";
const CLIENT_SECRET = "ab3c3a116e35d9fe11d409cb8c1205e9ae5a7e91";
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const REDIRECT_URI = chrome.identity.getRedirectURL("provider_cb");

// Simplified auth flow with better error handling
async function getTokenFromOauth() {
  try {
    // Check if we already have a token
    const { access_token } = await getSyncStorage({ access_token: null });
    
    if (access_token) {
      showFeedback("Access Token Already Set!");
      return;
    }
    
    // Build auth URL with proper parameters
    const authUrl = `${GITHUB_AUTH_URL}?${queryString.stringify({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "public_repo"
    })}`;
    
    // Launch OAuth flow
    const token = await launchAuthFlow(authUrl);
    
    // Save token
    await setSyncStorage({ access_token: token });
    
    // Update UI
    const accessTokenInput = document.getElementById("token-input");
    if (accessTokenInput) accessTokenInput.value = token;
    
    showFeedback("Access Token Set!");
  } catch (error) {
    console.error("OAuth error:", error);
    showFeedback(error.message || "Authentication failed");
  }
}

// Helper function to show feedback in the options page
function showFeedback(message) {
  const feedback = document.querySelector("#feedback");
  if (feedback) {
    feedback.textContent = message;
    feedback.style.display = "block";
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedback.style.display = "none";
    }, 3000);
  }
}

// Simplified auth flow
function launchAuthFlow(authUrl) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!redirectUrl) {
          reject(new Error("Authentication was canceled"));
          return;
        }
        
        try {
          // Extract code from redirect URL
          const query = queryString.extract(redirectUrl);
          const params = queryString.parse(query);
          
          if (params.access_token) {
            resolve(params.access_token);
          } else if (params.code) {
            // Exchange code for token
            const tokenUrl = `${GITHUB_TOKEN_URL}?${queryString.stringify({
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              code: params.code
            })}`;
            
            const response = await fetch(tokenUrl);
            const data = await response.text();
            const tokenParams = queryString.parse(data);
            
            if (tokenParams.access_token) {
              resolve(tokenParams.access_token);
            } else {
              reject(new Error("Failed to get access token"));
            }
          } else {
            reject(new Error("No access token or code received"));
          }
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Export function
window.getTokenFromOauth = getTokenFromOauth;
