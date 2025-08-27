// options/options.js

// Saves options to chrome.storage.sync.
function saveOptions(e) {
  e.preventDefault();
  const apiKey = document.getElementById("apiKey").value;
  const model = document.getElementById("model").value;
  const defaultN = document.querySelector(
    'input[name="defaultN"]:checked'
  ).value;
  const saveSummaries = document.getElementById("saveSummaries").checked;

  if (!apiKey) {
    const status = document.getElementById("status");
    status.textContent = "Error: API Key is required.";
    status.style.color = "red";
    setTimeout(() => {
      status.textContent = "";
    }, 3000);
    return;
  }

  chrome.storage.sync.set(
    {
      apiKey: apiKey,
      model: model,
      defaultN: parseInt(defaultN, 10),
      saveSummaries: saveSummaries,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      status.style.color = "green";
      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default values from plan.txt
  const defaults = {
    apiKey: "",
    model: "gemini-2.0-flash-lite",
    defaultN: 100,
    saveSummaries: false,
  };

  chrome.storage.sync.get(defaults, (items) => {
    document.getElementById("apiKey").value = items.apiKey;
    document.getElementById("model").value = items.model;
    document.querySelector(
      `input[name="defaultN"][value="${items.defaultN}"]`
    ).checked = true;
    document.getElementById("saveSummaries").checked = items.saveSummaries;
  });
}

function deleteAllSummaries() {
  chrome.storage.local.clear(() => {
    const status = document.getElementById("status");
    status.textContent = "All summaries deleted.";
    status.style.color = "green";
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });
}

async function loadSavedMessages() {
  const messagesList = document.getElementById("saved-messages-list");
  if (!messagesList) {
    console.error("Saved messages container not found");
    return;
  }

  try {
    // Show loading state
    messagesList.innerHTML = "<p>Loading saved messages...</p>";

    // Get all stored data
    const items = await new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    // Filter out extension settings and get only summary data
    const summaryEntries = Object.entries(items).filter(([key, data]) => {
      return (
        data &&
        typeof data === "object" &&
        data.summary &&
        !["apiKey", "model", "defaultN", "saveSummaries"].includes(key)
      );
    });

    if (summaryEntries.length === 0) {
      messagesList.innerHTML = "<p>No saved messages found.</p>";
      return;
    }

    // Sort by timestamp (newest first) and create DOM elements efficiently
    const sortedMessages = summaryEntries
      .sort(([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0))
      .map(([key, data]) => createMessageElement(data, key));

    // Clear container and append all messages at once
    messagesList.innerHTML = "";
    messagesList.append(...sortedMessages);
  } catch (error) {
    console.error("Error loading saved messages:", error);
    messagesList.innerHTML = `<p style="color: #ff4444;">Error loading messages: ${error.message}</p>`;
  }
}

/**
 * Creates a DOM element for a saved message
 * @param {Object} data - Message data object
 * @param {string} key - Storage key
 * @returns {HTMLElement} - Created message element
 */
function createMessageElement(data, key) {
  const messageElement = document.createElement("div");
  messageElement.className = "saved-message";
  messageElement.setAttribute("data-key", key);

  const header = document.createElement("div");
  header.className = "message-header";
  header.textContent = data.chatTitle || "Untitled Chat";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = data.summary;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = new Date(data.timestamp).toLocaleString();

  messageElement.append(header, content, meta);
  return messageElement;
}

document.addEventListener("DOMContentLoaded", () => {
  restoreOptions();
  loadSavedMessages();
});

document.getElementById("options-form").addEventListener("submit", saveOptions);
document
  .getElementById("delete-all-summaries")
  .addEventListener("click", deleteAllSummaries);
