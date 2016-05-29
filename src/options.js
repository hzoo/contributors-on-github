/* global getSyncStorage, setSyncStorage, clearSyncStorage, getTokenFromOauth */

document.addEventListener("DOMContentLoaded", () => {
  const accessTokenInput = document.getElementById("token-input");
  const oauthLink = document.getElementById("use-oauth");
  const clearCacheLink = document.getElementById("clear-cache");
  const showPrivateReposInput = document.getElementById("show-private-repos");

  getSyncStorage({ "access_token": null, "_showPrivateRepos": null })
  .then(({ access_token, _showPrivateRepos }) => {
    if (access_token) accessTokenInput.value = access_token;
    if (_showPrivateRepos) showPrivateReposInput.checked = _showPrivateRepos;
  });

  accessTokenInput.addEventListener("change", () => {
    setSyncStorage({ "access_token": accessTokenInput.value });
  });

  oauthLink.addEventListener("click", () => {
    getTokenFromOauth();
  });

  clearCacheLink.addEventListener("click", () => {
    let temp = accessTokenInput.value;
    chrome.storage.sync.clear(() => {
      setSyncStorage({ "access_token": temp });
      document.querySelector("#feedback").textContent = "Storage Cleared";
    });
  });

  showPrivateReposInput.addEventListener("change", () => {
    setSyncStorage({ "_showPrivateRepos": showPrivateReposInput.checked });
  })
});

