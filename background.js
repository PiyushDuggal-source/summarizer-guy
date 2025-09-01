// background.js (MV3 service worker)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Basic Scaffold extension installed.');
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({
    windowId: tab.windowId
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ type: 'PONG', time: Date.now() });
  }
});
