/* global getSyncStorage, setSyncStorage, clearSyncStorage, getTokenFromOauth */

document.addEventListener("DOMContentLoaded", () => {
  const accessTokenInput = document.getElementById("token-input");
  const oauthLink = document.getElementById("use-oauth");
  const clearCacheLink = document.getElementById("clear-cache");

  getSyncStorage({ "access_token": null })
  .then(({ access_token }) => {
    if (access_token) accessTokenInput.value = access_token;
  });

  accessTokenInput.addEventListener("change", () => {
    setSyncStorage({ "access_token": accessTokenInput.value });
  });

  oauthLink.addEventListener("click", () => {
    getTokenFromOauth();
  });

  clearCacheLink.addEventListener("click", () => {
    let temp = accessTokenInput.value;
    clearSyncStorage()
    .then(() => {
      setSyncStorage({ "access_token": temp });
      document.querySelector("#feedback").textContent = "Storage Cleared";
    });
  });
});

