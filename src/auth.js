const client_id = "1a3ac4d44a9e65a75a77";
const client_secret = "ab3c3a116e35d9fe11d409cb8c1205e9ae5a7e91";
const githubBaseUrl = "https://github.com/login/oauth/authorize";
const githubTokenUrl = "https://github.com/login/oauth/access_token";
const redirectUri = chrome.identity.getRedirectURL('provider_cb');

console.log(redirectUri);

const getAuthUrl = (base, callbackUrl, scope) => {
  let obj = {
    client_id,
    client_secret,
    redirect_uri: callbackUrl,
    scope: scope
  };

  return `${base}?${queryString.stringify(obj)}`;
}

function getTokenFromCode(code) {
  let obj = {
    client_id,
    client_secret,
    code
  };

  return fetch(`${githubTokenUrl}?${queryString.stringify(obj)}`)
  .then((res) => res.text(), (err) => {
    throw new Error("Failed to get access_token");
  });
}

function getToken(url, interactive) {
  return new Promise(function (resolve, reject) {
    // Opens a window to initiate GitHub OAuth, fires callback
    // with token in the URL.
    chrome.identity.launchWebAuthFlow({
      url,
      interactive
    }, function(redirectURL) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      // Upon success the response is appended to redirectUri, e.g.
      // https://{app_id}.chromiumapp.org/provider_cb#access_token={value}
      //     &refresh_token={value}
      // or:
      // https://{app_id}.chromiumapp.org/provider_cb#code={value}
      let query = queryString.extract(redirectURL);
      if (query) {
        let obj = queryString.parse(query);

        if (obj.access_token) {
          resolve(obj.access_token);
        } else if (obj.code) {
          getTokenFromCode(obj.code)
          .then((res) => {
            let resObj = queryString.parse(res);
            let access_token = resObj.access_token;
            resolve(access_token);
          });
        } else {
          reject(new Error ('neither access_token nor code available'));
        }
      } else {
        reject(new Error('Invalid redirect URI'));
      }
    });
  });
}

function getTokenFromOauth() {
  getSyncStorage({ 'access_token': null })
  .then((res) => {
    if (!res.access_token) {
      const url = getAuthUrl(githubBaseUrl, redirectUri, 'public_repo');
      getToken(url, true)
      .then((token) => {
        setSyncStorage({ 'access_token': token });
        const accessTokenInput = document.getElementById("token-input");
        accessTokenInput.value = token;
        document.querySelector("#feedback").textContent = "Access Token Set!";
      }, (message) => {
        document.querySelector("#feedback").textContent = message;
      })
    } else {
      document.querySelector("#feedback").textContent = "Access Token Already Set!";
    }
  });
}

window.getTokenFromOauth = getTokenFromOauth;
