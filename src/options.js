/* global getSyncStorage, setSyncStorage */

document.addEventListener("DOMContentLoaded", () => {
  const formOauthToken = document.getElementById("oauth_token");
  const formRepos = document.getElementById("repos");

  getSyncStorage({ "access_token": null, "repos": null })
  .then(({ access_token, repos }) => {
    if (access_token) formOauthToken.value = access_token;
    if (repos) formRepos.value = repos;
  });

  formOauthToken.addEventListener("change", () => {
    setSyncStorage({ "access_token": formOauthToken.value });
  });

  formRepos.addEventListener("change", () => {
    setSyncStorage({ "repos": formRepos.value });
  });
});
