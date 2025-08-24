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

function loadSavedMessages() {
  const messagesList = document.getElementById('saved-messages-list');
  messagesList.innerHTML = '<p>Loading saved messages...</p>';

  chrome.storage.local.get(null, (items) => {
    // Remove extension settings
    delete items.apiKey;
    delete items.model;
    delete items.defaultN;
    delete items.saveSummaries;

    const messages = Object.entries(items);
    
    if (messages.length === 0) {
      messagesList.innerHTML = '<p>No saved messages found.</p>';
      return;
    }

    messagesList.innerHTML = '';
    
    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
    
    messages.forEach(([key, data]) => {
      if (data && data.summary) {
        const messageElement = document.createElement('div');
        messageElement.className = 'saved-message';
        messageElement.innerHTML = `
          <div class="message-header">${data.chatTitle || 'Untitled Chat'}</div>
          <div class="message-content">${data.summary}</div>
          <div class="message-meta">
            ${new Date(data.timestamp).toLocaleString()}
          </div>
        `;
        messagesList.appendChild(messageElement);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  restoreOptions();
  loadSavedMessages();
});

document.getElementById("options-form").addEventListener("submit", saveOptions);
document.getElementById("delete-all-summaries").addEventListener("click", deleteAllSummaries);