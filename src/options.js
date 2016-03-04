/* global getSyncStorage, setSyncStorage */

document.addEventListener("DOMContentLoaded", () => {
  const formOauthToken = document.getElementById("oauth_token");
  getSyncStorage({ "access_token": null })
  .then(({ access_token }) => {
    formOauthToken.value = access_token;
  });

  formOauthToken.addEventListener("change", () => {
    setSyncStorage({ "access_token": formOauthToken.value });
  });

  const formRepos = document.getElementById("repos");
  formRepos.addEventListener("change", () => {
    setSyncStorage({ "repos": formRepos.value });
  });
});
