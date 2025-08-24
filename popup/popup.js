
console.log("Popup script loaded.");
// popup/popup.js
import { getGroupsWithUnread, getLastNMessages } from './messaging.js';
import { summarizeMessages } from '../gemini.js';

// Helper to open the options page
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

function renderGroups(groups) {
  const container = document.getElementById('group-list-container');
  if (!groups || groups.length === 0) {
    container.innerHTML = '<p>No groups with unread messages found.</p>';
    return;
  }

  container.innerHTML = '';
  groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.innerHTML = `
      <div class="group-avatar">${group.name.charAt(0).toUpperCase()}</div>
      <div class="group-info">
        <div class="group-name">${group.name}</div>
      </div>
      <span class="unread-badge">${group.unreadCount}</span>
      <button class="summarize-btn" data-group-id="${group.id}" data-group-name="${group.name}">Summarize</button>
    `;
    container.appendChild(card);
  });

  // Add event listeners to the new buttons
  document.querySelectorAll('.summarize-btn').forEach(btn => {
    btn.addEventListener('click', handleSummarizeClick);
  });
}

async function handleSummarizeClick(event) {
  const button = event.target;
  const groupId = button.dataset.groupId;
  const groupName = button.dataset.groupName;
  const n = document.querySelector('input[name="n-value"]:checked').value;

  const resultsPanel = document.getElementById('results-panel');
  const resultsGroupName = document.getElementById('results-group-name');
  const summaryOutput = document.getElementById('summary-output');

  resultsGroupName.textContent = `Summary for ${groupName}`;
  summaryOutput.innerHTML = '<p>Loading summary...</p>';
  resultsPanel.style.display = 'block';

  try {
    const { apiKey, model, saveSummaries } = await chrome.storage.sync.get(['apiKey', 'model', 'saveSummaries']);
    if (!apiKey) {
      summaryOutput.innerHTML = '<p>API Key not found. Please set it in the options.</p>';
      return;
    }

    const response = await getLastNMessages(n);
    const messages = response.messages;
    console.log(`Got ${messages.length} messages for group ${groupId}`);

    const summary = await summarizeMessages(apiKey, model || 'gemini-2.0-flash-lite', messages);

    summaryOutput.innerHTML = `
      <h4>tl;dr</h4>
      <p>${summary.tldr}</p>
      <h4>Key Points</h4>
      <ul>
        ${summary.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
      </ul>
    `;

    const saveToggle = document.getElementById('save-summary-toggle');
    saveToggle.checked = saveSummaries;
    if (saveSummaries) {
      saveSummary(groupId, groupName, summary);
    }

  } catch (error) {
    console.error('Error summarizing messages:', error);
    summaryOutput.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

function handleCopyClick() {
  const summaryOutput = document.getElementById('summary-output');
  navigator.clipboard.writeText(summaryOutput.innerText)
    .then(() => {
      const copyButton = document.getElementById('copy-summary');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
}

function handleSaveToggleChange(event) {
  const saveSummaries = event.target.checked;
  chrome.storage.sync.set({ saveSummaries });

  if (saveSummaries) {
    const groupId = document.getElementById('results-group-name').textContent.replace('Summary for ', '');
    const summary = document.getElementById('summary-output').innerHTML;
    // This is a simplified way to get the summary data. A better way would be to store it in a variable.
    const tldr = document.querySelector('#summary-output p').textContent;
    const bullets = Array.from(document.querySelectorAll('#summary-output li')).map(li => li.textContent);
    saveSummary(groupId, groupId, { tldr, bullets });
  }
}

function saveSummary(groupId, groupName, summary) {
  const key = `summary_${groupId}_${new Date().toISOString()}`;
  chrome.storage.local.set({ [key]: { groupName, summary, date: new Date().toISOString() } }, () => {
    console.log(`Summary saved for group ${groupName}`);
  });
}

// Main function to initialize the popup
async function initializePopup() {
  document.getElementById('settings-btn').addEventListener('click', openOptionsPage);
  document.getElementById('go-to-options').addEventListener('click', openOptionsPage);
  document.getElementById('copy-summary').addEventListener('click', handleCopyClick);
  document.getElementById('save-summary-toggle').addEventListener('change', handleSaveToggleChange);

  const mainContent = document.getElementById('main-content');
  const optionsPrompt = document.getElementById('options-prompt');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.url && tab.url.startsWith("https://web.whatsapp.com")) {
      // Check if API key is set.
      chrome.storage.sync.get(['apiKey', 'saveSummaries'], ({ apiKey, saveSummaries }) => {
        if (apiKey) {
          // API Key exists, show the main UI
          mainContent.style.display = 'block';
          optionsPrompt.style.display = 'none';
          document.getElementById('save-summary-toggle').checked = saveSummaries;
          
          // Fetch and display groups
          getGroupsWithUnread()
            .then(response => {
              renderGroups(response.groups);
            })
            .catch(error => {
              console.error('Error getting groups:', error);
              const container = document.getElementById('group-list-container');
              container.innerHTML = `<p>Error: ${error.message}</p>`;
            });

        } else {
          // API Key is missing, prompt user to set it.
          mainContent.style.display = 'none';
          optionsPrompt.style.display = 'block';
        }
      });
    } else {
      mainContent.innerHTML = '<p>This extension only works on WhatsApp Web.</p><p>Please open WhatsApp Web and try again.</p>';
    }
  });
}

document.addEventListener('DOMContentLoaded', initializePopup);
