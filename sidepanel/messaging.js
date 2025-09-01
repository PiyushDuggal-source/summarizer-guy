// chrome-extension/popup/messaging.js

// Cache for active tab ID
let activeTabId = null;

// Helper to get the active tab
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error('No active tab found');
  }
  activeTabId = tab.id;
  return tab;
}

// Helper to inject content script if needed
async function ensureContentScript(tabId) {
  try {
    // Check if content script is already injected
    await chrome.scripting.executeScript({
      target: { tabId },
      function: () => ({}), // No-op function to check if content script is loaded
    });
  } catch (error) {
    console.log('Injecting content script...');
    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content/content.js']
    });
    // Give the content script a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Send message with retry and content script injection
async function sendMessage(type, data, retries = 2) {
  try {
    const tab = await getActiveTab();
    await ensureContentScript(tab.id);

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          if (retries > 0) {
            console.log(`Retrying (${retries} attempts left)...`);
            return setTimeout(() => {
              sendMessage(type, data, retries - 1).then(resolve).catch(reject);
            }, 300);
          }
          return reject(new Error(`Failed to send message: ${chrome.runtime.lastError.message}`));
        }
        if (response?.error) {
          return reject(new Error(response.error));
        }
        resolve(response);
      });
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}

export async function getGroupsWithUnread() {
  try {
    console.log('Fetching groups with unread messages...');
    const response = await sendMessage("GET_GROUPS_WITH_UNREAD");
    console.log('Received groups:', response?.groups?.length || 0);
    return response;
  } catch (error) {
    console.error('Error in getGroupsWithUnread:', error);
    throw new Error(`Failed to get groups: ${error.message}`);
  }
}

export async function getCurrentGroup() {
  try {
    console.log('Fetching current group...');
    return await sendMessage("GET_CURRENT_GROUP");
  } catch (error) {
    console.error('Error in getCurrentGroup:', error);
    throw new Error(`Failed to get current group: ${error.message}`);
  }
}

export async function getLastNMessages(n) {
  try {
    console.log(`Fetching last ${n} messages...`);
    const response = await sendMessage("GET_LAST_N_MESSAGES", { n });
    console.log(`Received ${response?.messages?.length || 0} messages`);
    return response;
  } catch (error) {
    console.error('Error in getLastNMessages:', error);
    throw new Error(`Failed to get messages: ${error.message}`);
  }
}