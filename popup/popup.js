console.log("Popup script loaded.");
// popup/popup.js
import { getLastNMessages } from "./messaging.js";
import { summarizeMessages } from "../gemini.js";

// Helper to open the options page
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// function renderGroups(groups) {
//   const container = document.getElementById('group-list-container');
//   if (!groups || groups.length === 0) {
//     container.innerHTML = '<p>No groups with unread messages found.</p>';
//     return;
//   }

//   container.innerHTML = '';
//   console.log("Groups: ", groups)
//   groups.forEach(group => {
//     const card = document.createElement('div');
//     card.className = 'group-card';
//     // Create a selector for this group
//     const groupSelector = `div[role="listitem"]:has(span[title="${group.name.replace(/"/g, '\\"')}"])`;

//     card.innerHTML = `
//       <div class="group-avatar">${group.name.charAt(0).toUpperCase()}</div>
//       <div class="group-info">
//         <div class="group-name">${group.name}</div>
//       </div>
//       <span class="unread-badge">${group.unreadCount}</span>
//       <button class="summarize-btn"
//               data-group-id="${group.id}"
//               data-group-name="${group.name}"
//               data-group-selector="${groupSelector.replace(/"/g, '&quot;')}">
//         Summarize
//       </button>
//     `;
//     container.appendChild(card);
//   });

//   // Add event listeners to the new buttons
//   document.querySelectorAll('.summarize-btn').forEach(btn => {
//     btn.addEventListener('click', handleSummarizeClick);
//   });
// }

// // Store the last clicked group element
// let lastClickedGroupElement = null;

// // Update the renderGroups function to store the element
// function renderGroups(groups) {
//   const container = document.getElementById('group-list-container');
//   if (!groups || groups.length === 0) {
//   // Add event listeners to the new buttons
async function handleSummarizeClick(event) {
  const button = event?.target?.closest(".summarize-btn");
  if (!button) return;

  const n = document.querySelector('input[name="n-value"]:checked').value;

  const summaryOutput = document.getElementById("summary-output");
  const errorOutput = document.getElementById("error");

  summaryOutput.innerHTML = "<p>Loading summary...</p>";
  summaryOutput.style.display = "block";

  try {
    const { apiKey, model, saveSummaries } = await chrome.storage.sync.get([
      "apiKey",
      "model",
      "saveSummaries",
    ]);
    if (!apiKey) {
      summaryOutput.innerHTML =
        "<p>API Key not found. Please set it in the options.</p>";
      return;
    }

    const response = await getLastNMessages(n);
    const messages = response.messages;
    console.log(`Got ${messages.length} messages`);

    const summaryText = await summarizeMessages(
      apiKey,
      model || "gemini-2.0-flash-lite",
      messages
    );

    // Display the raw text response from the LLM
    summaryOutput.innerHTML = `<div class="summary-content">${summaryText.replace(
      /\n/g,
      "<br>"
    )}</div>`;

    const saveToggle = document.getElementById("save-summary-toggle");
    saveToggle.checked = saveSummaries;
    if (saveSummaries) {
      saveSummary(summaryText);
    }
  } catch (error) {
    console.error("Error summarizing messages:", error);
    errorOutput.innerHTML = `<p>Error: ${error.message}</p>`;
    errorOutput.style.display = "block";
  }
}

function handleCopyClick() {
  const summaryOutput = document.getElementById("summary-output");
  navigator.clipboard
    .writeText(summaryOutput.innerText)
    .then(() => {
      const copyButton = document.getElementById("copy-summary");
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

function handleSaveToggleChange(event) {
  const saveSummaries = event.target.checked;
  chrome.storage.sync.set({ saveSummaries });

  if (saveSummaries) {
    const summary = document.getElementById("summary-output").innerHTML;
    // This is a simplified way to get the summary data. A better way would be to store it in a variable.
    saveSummary(summary);
  }
}

function saveSummary(summary) {
  const key = `summary_${new Date().toISOString()}`;
  chrome.storage.local.set(
    { [key]: { summary, date: new Date().toISOString() } },
    () => {
      console.log(`Summary saved`);
    }
  );
}

// Main function to initialize the popup
async function initializePopup() {
  document
    .getElementById("settings-btn")
    .addEventListener("click", openOptionsPage);
  document
    .getElementById("copy-summary")
    .addEventListener("click", handleCopyClick);
  document
    .getElementById("save-summary-toggle")
    .addEventListener("change", handleSaveToggleChange);
  document
    .getElementById("summarize-current")
    .addEventListener("click", handleSummarizeClick);

  const mainContent = document.getElementById("main-content");
  const optionsPrompt = document.getElementById("options-prompt");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.url && tab.url.startsWith("https://web.whatsapp.com")) {
      // Check if API key is set.
      chrome.storage.sync.get(
        ["apiKey", "saveSummaries"],
        ({ apiKey, saveSummaries }) => {
          if (apiKey) {
            // API Key exists, show the main UI
            mainContent.style.display = "block";
            optionsPrompt.style.display = "none";
            document.getElementById("save-summary-toggle").checked =
              saveSummaries;

            // Fetch and display groups
            // getGroupsWithUnread()
            //   .then(response => {
            //     renderGroups(response.groups);
            //   })
            //   .catch(error => {
            //     console.error('Error getting groups:', error);
            //     const container = document.getElementById('group-list-container');
            //     container.innerHTML = `<p>Error: ${error.message}</p>`;
            //   });
          } else {
            // API Key is missing, prompt user to set it.
            mainContent.style.display = "none";
            optionsPrompt.style.display = "block";
          }
        }
      );
    } else {
      mainContent.innerHTML =
        "<p>This extension only works on WhatsApp Web.</p><p>Please open WhatsApp Web and try again.</p>";
    }
  });
}

document.addEventListener("DOMContentLoaded", initializePopup);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "changeInfo") {
    document.getElementById("status").innerText = message.text;
    document.getElementById("status").style.display = "block";
    setTimeout(() => {
      document.getElementById("status").style.display = "none";
    }, 2000);
  }
});
