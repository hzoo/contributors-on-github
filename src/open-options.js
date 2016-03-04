/* global chrome */

// launch options page on first run
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

// since it looks like github uses pushState for navigation between issues
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('Page uses History API and we heard a pushSate/replaceState.');
  // do your thing
  if (details.url.match(/https?:\/\/(www\.)?github\.com\/\w+\/\w+\/pull\/\d+$/)) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, "update");
    });
  }
});
