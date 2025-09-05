console.log("Popup script loaded.");
// popup/popup.js
import { getLastNMessages, getCurrentGroup } from "./messaging.js";
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
//     const groupSelector = `div[role="listitem"]:has(span[title="${group.name.replace(/"/g, '\"')}"])`;

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

  const n = getSelectedMessageCount();
  if (n === null) {
    // Show error and return
    return;
  }

  const summaryOutput = document.getElementById("summary-output");
  const errorOutput = document.getElementById("error");
  const saveToggleContainer = document.getElementById(
    "save-summary-toggle-container",
  ); // Get the container

  summaryOutput.innerHTML = "<p>Loading summary...</p>";
  summaryOutput.style.display = "block";
  saveToggleContainer.style.display = "none"; // Hide it initially
  errorOutput.style.display = "none";

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

    console.log("Response: ", response);

    if (response?.messages?.error === "NO_CHAT_CONTAINER") {
      console.error("Error fetching messages: ", response.error);
      summaryOutput.style.display = "none";
      errorOutput.innerHTML = `<p>Chat container not found. Please open a chat and try again.</p>`;
      errorOutput.style.display = "block";
      return;
    }

    const messages = response?.messages;
    console.log(`Got ${messages?.length || 0} messages`);

    const summaryText = await summarizeMessages(
      apiKey,
      model || "gemini-2.0-flash-lite",
      messages,
    );

    console.log("Summary text: ", summaryText);

    // --- Start of changes for "summaryText.replace is not a function" error ---
    if (typeof summaryText !== "string") {
      console.error("summarizeMessages did not return a string:", summaryText);
      summaryOutput.innerHTML = `<p>Error: Failed to generate summary. Unexpected response format.</p>`;
      errorOutput.innerHTML = `<p>Error: Unexpected summary format.</p>`;
      errorOutput.style.display = "block";
      return; // Exit the function
    }
    // --- End of changes ---

    // Display the raw text response from the LLM
    summaryOutput.innerHTML = `<div class="summary-content">${summaryText.replace(
      /\n/g,
      "<br>",
    )}</div>`;

    // --- Start of changes for showing copy button ---
    saveToggleContainer.style.display = "flex"; // Show the container after summary is displayed
    // --- End of changes ---

    const saveToggle = document.getElementById("save-summary-toggle");
    saveToggle.checked = saveSummaries;
    if (saveSummaries) {
      // Get current group info for saving
      const chatInfo = await getCurrentGroup();
      saveSummary(summaryText, n, chatInfo);
    }
  } catch (error) {
    console.error("Error summarizing messages:", error);
    errorOutput.innerHTML = `<p>Error: Please reload the page if you have just installed the extension!</p>`;
    errorOutput.style.display = "block";
    saveToggleContainer.style.display = "none"; // Hide on error
  }
}

/**
 * Get the selected message count, handling custom input validation
 * @returns {number|null} The selected message count or null if invalid
 */
function getSelectedMessageCount() {
  const selectedRadio = document.querySelector('input[name="n-value"]:checked');
  if (!selectedRadio) return null;

  if (selectedRadio.value === "custom") {
    const customInput = document.getElementById("custom-n-input");
    const customValue = parseInt(customInput.value, 10);

    if (isNaN(customValue) || customValue < 1 || customValue > 50) {
      showCustomInputError("Please enter a number between 1 and 50");
      return null;
    }

    hideCustomInputError();
    return customValue;
  }

  return parseInt(selectedRadio.value, 10);
}

/**
 * Show error message for custom input
 * @param {string} message - Error message to display
 */
function showCustomInputError(message) {
  const errorElement = document.getElementById("custom-input-error");
  errorElement.textContent = message;
  errorElement.style.display = "inline";
}

/**
 * Hide error message for custom input
 */
function hideCustomInputError() {
  const errorElement = document.getElementById("custom-input-error");
  errorElement.style.display = "none";
}

/**
 * Handle radio button changes to show/hide custom input
 */
function handleRadioChange() {
  const customContainer = document.getElementById("custom-input-container");
  const customInput = document.getElementById("custom-n-input");
  const customRadio = document.getElementById("n-custom");

  if (customRadio.checked) {
    customContainer.style.display = "block";
    customInput.focus();
  } else {
    customContainer.style.display = "none";
    customInput.value = "";
    hideCustomInputError();
  }
}

/**
 * Handle custom input changes to validate and clear errors
 */
function handleCustomInputChange() {
  const customInput = document.getElementById("custom-n-input");
  const value = parseInt(customInput.value, 10);

  if (customInput.value === "" || (value >= 1 && value <= 50)) {
    hideCustomInputError();
  }
}

/**
 * Handle API key setup form submission
 */
async function handleApiKeySetup() {
  const apiKeyInput = document.getElementById("api-key-input");
  const saveSummariesCheckbox = document.getElementById(
    "save-summaries-default",
  );

  const apiKey = apiKeyInput.value.trim();
  const saveSummaries = saveSummariesCheckbox.checked;

  // Validate API key
  if (!apiKey) {
    showApiKeyError("Please enter your API key");
    return;
  }

  if (!apiKey.startsWith("AIza")) {
    showApiKeyError("API key should start with 'AIza'");
    return;
  }

  try {
    // Save settings to storage with default values
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(
        {
          apiKey,
          model: "gemini-2.0-flash-lite", // Default model
          defaultN: 100, // Default message count
          saveSummaries,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        },
      );
    });

    // Switch to main interface
    showMainInterface();

    // Set default values in main interface
    const defaultRadio = document.querySelector(
      'input[name="n-value"][value="100"]',
    );
    if (defaultRadio) {
      defaultRadio.checked = true;
    }

    document.getElementById("save-summary-toggle").checked = saveSummaries;
  } catch (error) {
    console.error("Error saving API key:", error);
    showApiKeyError(`Failed to save: ${error.message}`);
  }
}

/**
 * Show API key error message
 * @param {string} message - Error message to display
 */
function showApiKeyError(message) {
  const errorElement = document.getElementById("api-key-error");
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

/**
 * Show the main extension interface
 */
function showMainInterface() {
  document.getElementById("api-key-setup").style.display = "none";
  document.getElementById("main-interface").style.display = "block";
}

/**
 * Show the API key setup interface
 */
function showApiKeySetup() {
  document.getElementById("api-key-setup").style.display = "block";
  document.getElementById("main-interface").style.display = "none";
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

async function handleSaveToggleChange(event) {
  const saveSummaries = event.target.checked;
  chrome.storage.sync.set({ saveSummaries });

  if (saveSummaries) {
    const summary = document.getElementById("summary-output").innerText;
    // Get current group info and message count for saving
    try {
      const chatInfo = await getCurrentGroup();
      const n = getSelectedMessageCount() || 0;
      saveSummary(summary, n, chatInfo);
    } catch (error) {
      console.error("Error saving summary on toggle:", error);
    }
  }
}

async function saveSummary(summary, messageCount, chatInfo = null) {
  try {
    // Get current chat/group info if not provided
    if (!chatInfo) {
      chatInfo = await getCurrentGroup();
    }

    // Clean the summary by removing HTML tags and extracting plain text
    let cleanSummary = summary;
    if (typeof summary === "string") {
      // Create a temporary div to parse HTML and extract text
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = summary;
      cleanSummary = tempDiv.innerText || tempDiv.textContent || summary;
    }

    const timestamp = new Date().toISOString();
    const key = `summary_${timestamp}`;

    const summaryData = {
      summary: cleanSummary,
      timestamp: timestamp,
      messageCount: messageCount,
      chatTitle: chatInfo?.group?.name || "Unknown Chat",
      chatId: chatInfo?.group?.id || "unknown",
      date: timestamp,
    };

    chrome.storage.local.set({ [key]: summaryData }, () => {
      console.log(`Summary saved with key: ${key}`);
    });
  } catch (error) {
    console.error("Error saving summary:", error);
  }
}

// Main function to initialize the popup
async function initializePopup() {
  // Add event listeners for API key setup
  document
    .getElementById("save-api-key")
    .addEventListener("click", handleApiKeySetup);

  // Add event listeners for main interface
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

  // Add event listeners for radio buttons and custom input
  document.querySelectorAll('input[name="n-value"]').forEach((radio) => {
    radio.addEventListener("change", handleRadioChange);
  });

  document
    .getElementById("custom-n-input")
    .addEventListener("input", handleCustomInputChange);

  // Check if API key exists and show appropriate interface
  try {
    const { apiKey } = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(["apiKey"], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    if (apiKey) {
      // API Key exists, show the main interface
      showMainInterface();

      // Load other settings
      const { saveSummaries } = await new Promise((resolve, reject) => {
        chrome.storage.sync.get(["saveSummaries"], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });

      document.getElementById("save-summary-toggle").checked = saveSummaries;
    } else {
      // API Key is missing, show the setup form
      showApiKeySetup();
    }
  } catch (error) {
    console.error("Error checking API key:", error);
    // Show setup form on error
    showApiKeySetup();
  }

  // Check if we're on WhatsApp Web
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab.url || !tab.url.startsWith("https://web.whatsapp.com")) {
      // Not on WhatsApp Web, show message
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.innerHTML =
          "<p>This extension only works on WhatsApp Web.</p><p>Please open WhatsApp Web and try again.</p>";
      }
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
