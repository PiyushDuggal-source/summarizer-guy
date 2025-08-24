// background.js (MV3 service worker)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Basic Scaffold extension installed.');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ type: 'PONG', time: Date.now() });
  }
});
