/* global getSyncStorage, setSyncStorage */

document.addEventListener("DOMContentLoaded", () => {
  const oauthTokenInput = document.getElementById("oauth_token");
  const reposInput = document.getElementById("repos");

  getSyncStorage({ "access_token": null, "repos": null })
  .then(({ access_token, repos }) => {
    if (access_token) oauthTokenInput.value = access_token;
    if (repos) reposInput.value = repos;
  });

  oauthTokenInput.addEventListener("change", () => {
    setSyncStorage({ "access_token": oauthTokenInput.value });
  });

  reposInput.addEventListener("change", () => {
    setSyncStorage({ "repos": reposInput.value });
  });
});
