/* global chrome, queryString, getSyncStorage, setSyncStorage */

const CLIENT_ID = "1a3ac4d44a9e65a75a77";
const CLIENT_SECRET = "ab3c3a116e35d9fe11d409cb8c1205e9ae5a7e91";
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const REDIRECT_URI = chrome.identity.getRedirectURL("provider_cb");

function getAuthUrl(base, callbackUrl, scope) {
  const params = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: callbackUrl,
    scope,
  };

  return `${base}?${queryString.stringify(params)}`;
}

async function getTokenFromCode(code) {
  try {
    const params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    };
    
    const response = await fetch(`${GITHUB_TOKEN_URL}?${queryString.stringify(params)}`);
    return await response.text();
  } catch (error) {
    throw new Error("Failed to get access_token");
  }
}

function getToken(url, interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive },
      async (redirectURL) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const query = queryString.extract(redirectURL);
        if (!query) {
          reject(new Error("Invalid redirect URI"));
          return;
        }

        const params = queryString.parse(query);

        if (params.access_token) {
          resolve(params.access_token);
        } else if (params.code) {
          try {
            const response = await getTokenFromCode(params.code);
            const responseParams = queryString.parse(response);
            resolve(responseParams.access_token);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("Neither access_token nor code available"));
        }
      }
    );
  });
}

async function getTokenFromOauth() {
  try {
    const { access_token } = await getSyncStorage({ access_token: null });
    
    if (!access_token) {
      const url = getAuthUrl(GITHUB_AUTH_URL, REDIRECT_URI, "public_repo");
      try {
        const token = await getToken(url, true);
        await setSyncStorage({ access_token: token });
        
        const accessTokenInput = document.getElementById("token-input");
        if (accessTokenInput) accessTokenInput.value = token;
        
        const feedback = document.querySelector("#feedback");
        if (feedback) {
          feedback.textContent = "Access Token Set!";
          feedback.style.display = "block";
        }
      } catch (error) {
        const feedback = document.querySelector("#feedback");
        if (feedback) {
          feedback.textContent = error.message ? `Error: ${error.message}` : String(error);
          feedback.style.display = "block";
        }
      }
    } else {
      const feedback = document.querySelector("#feedback");
      if (feedback) {
        feedback.textContent = "Access Token Already Set!";
        feedback.style.display = "block";
      }
    }
  } catch (error) {
    console.error("OAuth error:", error);
  }
}

window.getTokenFromOauth = getTokenFromOauth;
