/* global chrome DCE DCS */

// GitHub Enterprise support
DCE.addContextMenu();
DCS.addToFutureTabs();

// launch options page on first run
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});
