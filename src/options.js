/* global getSyncStorage, setSyncStorage */

document.addEventListener("DOMContentLoaded", () => {
  const accessTokenInput = document.getElementById("token-input");

  getSyncStorage({ "access_token": null })
  .then(({ access_token }) => {
    if (access_token) accessTokenInput.value = access_token;
  });

  accessTokenInput.addEventListener("change", () => {
    setSyncStorage({ "access_token": accessTokenInput.value });
  });
});
