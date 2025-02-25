/* global chrome */

/**
 * Contributors on GitHub - Browser Extension
 * Opens the options page when the extension icon is clicked
 */

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
}); 