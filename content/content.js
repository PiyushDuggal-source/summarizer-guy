// content/content.js
console.log("Content script loaded for WhatsApp Web.");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in content script:", msg);

  switch (msg.type) {
    case "GET_GROUPS_WITH_UNREAD":
      sendResponse({ groups: listGroupsWithUnread() });
      break;
    case "GET_CURRENT_GROUP":
      sendResponse({ group: getCurrentGroupInfo() });
      break;
    case "GET_LAST_N_MESSAGES":
      getLastNMessages(msg.n).then((messages) => {
        sendResponse({ messages });
      });
      break;
    default:
      sendResponse({ error: "Unknown message type" });
      break;
  }

  // Return true to indicate that the response will be sent asynchronously
  return true;
});

function listGroupsWithUnread() {
  console.log("Listing groups with unread messages...");
  const groups = [];
  const chatElements = document.querySelectorAll('div[role="listitem"]');
  console.log(`Found ${chatElements.length} chat elements.`);

  chatElements.forEach((el) => {
    const unreadBadge = el.querySelector('span[aria-label*="unread"]');
    if (unreadBadge) {
      const unreadCountMatch = unreadBadge.ariaLabel.match(/(\d+)/);
      if (unreadCountMatch) {
        const unreadCount = parseInt(unreadCountMatch[1], 10);
        if (!isNaN(unreadCount) && unreadCount > 0) {
          const nameElement = el.querySelector("span[title]");
          if (nameElement) {
            console.log(
              `Found group: ${nameElement.title} with ${unreadCount} unread messages.`
            );
            groups.push({
              id: nameElement.title, // Using title as a temporary ID
              name: nameElement.title,
              unreadCount: unreadCount,
            });
          }
        }
      }
    }
  });

  console.log(`Found ${groups.length} groups with unread messages.`);
  return groups.sort((a, b) => b.unreadCount - a.unreadCount);
}

function getCurrentGroupInfo() {
  const headerElement = document.querySelector("header");
  if (headerElement) {
    const nameElement = headerElement.querySelector("span[title]");
    if (nameElement) {
      return {
        id: nameElement.title, // Using title as a temporary ID
        name: nameElement.title,
      };
    }
  }
  return null;
}

async function getLastNMessages(n) {
  console.log(`[WhatsApp] Fetching last ${n} messages...`);
  const messages = new Map();

  // Try multiple selectors for the message container
  const containerSelectors = [
    'div[role="log"]',
    'div[data-testid="conversation-panel-messages"]',
    'div[data-testid="msg-container"]',
    'div[class*="message-"]',
    'div[class*="msg-"]',
    'div[class*="conversation-"]',
    'div[class*="chat-"]',
    'div[class*="pane-body"]',
    'div[class*="pane-body"] > div',
    'div[class*="pane-body"] > div > div',
    'div[class*="pane-body"] > div > div > div',
  ];

  let messageContainer = null;
  for (const selector of containerSelectors) {
    messageContainer = document.querySelector(selector);
    if (messageContainer) {
      console.log(`Found message container with selector: ${selector}`);
      break;
    }
  }

  if (!messageContainer) {
    console.error(
      "[WhatsApp] Message container not found. Tried selectors:",
      containerSelectors
    );
    console.log("[WhatsApp] Document structure:", {
      bodyChildren: Array.from(document.body.children).map((el) => ({
        tag: el.tagName,
        id: el.id,
        classes: Array.from(el.classList),
        role: el.getAttribute("role"),
      })),
    });
    throw new Error(
      "Could not find message container. Make sure you are on a WhatsApp Web chat page."
    );
  }

  let lastMessageCount = 0;
  let stableScrolls = 0;
  const maxStableScrolls = 3; // Stop after 3 scrolls with no new messages

  while (messages.size < n && stableScrolls < maxStableScrolls) {
    const visibleMessages = getVisibleMessages();
    visibleMessages.forEach((msg) => {
      if (!messages.has(msg.id)) {
        messages.set(msg.id, msg);
      }
    });

    if (messages.size >= n) {
      break;
    }

    if (messages.size === lastMessageCount) {
      stableScrolls++;
    } else {
      stableScrolls = 0;
    }

    lastMessageCount = messages.size;
    messageContainer.scrollTop = 0;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for messages to load
  }

  return Array.from(messages.values()).slice(-n);
}

function getVisibleMessages() {
  console.log("[WhatsApp] Extracting visible messages...");
  const messages = [];

  // Try multiple selectors to find message elements
  const messageSelectors = [
    // Modern WhatsApp Web
    '[data-testid="msg-container"]',
    // Older versions
    'div[role="row"]',
    'div[data-id^="false_"]',
    'div[data-id^="true_"]',
    // Fallback to any div that looks like a message
    'div[class*="message-"]',
    'div[class*="msg-"]',
    'div[class*="bubble-"]',
  ];

  let messageElements = [];
  for (const selector of messageSelectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.length > 0) {
      console.log(
        `Found ${elements.length} messages with selector: ${selector}`
      );
      messageElements = elements;
      break;
    }
  }

  if (messageElements.length === 0) {
    console.warn(
      "[WhatsApp] No message elements found with standard selectors. Falling back to body scan..."
    );
    // Last resort: Get all divs with text that might be messages
    messageElements = Array.from(document.querySelectorAll("div")).filter(
      (el) => {
        return (
          el.textContent &&
          el.textContent.trim().length > 0 &&
          el.textContent.length < 1000
        ); // Filter out large text blocks
      }
    );
    console.log(
      `[WhatsApp] Found ${messageElements.length} potential message elements via fallback`
    );
  }

  messageElements.forEach((el, index) => {
    try {
      // Generate a unique ID if not present
      const messageId =
        el.getAttribute("data-id") || `msg-${Date.now()}-${index}`;

      // Try different ways to extract text content
      const textElement =
        el.querySelector('[data-testid="selectable-text"]') ||
        el.querySelector('[class*="selectable-text"]') ||
        el.querySelector('span[class*="copyable-text"]') ||
        el;

      // Try to find sender information
      let sender = "You"; // Default to 'You' for outgoing messages
      const senderElement =
        el.querySelector('[data-testid="sender-name"]') ||
        el.querySelector('[class*="sender-"]') ||
        el.querySelector('[class*="user-"]');

      // Try to find timestamp
      const timeElement =
        el.querySelector('[data-testid="message-meta"]') ||
        el.querySelector("span[aria-label]") ||
        el.querySelector("time") ||
        el.querySelector('[class*="time-"]');

      const message = {
        id: messageId,
        text: textElement?.textContent?.trim() || "",
        sender: senderElement?.textContent?.trim() || sender,
        timestampISO:
          timeElement?.getAttribute("datetime") ||
          timeElement?.ariaLabel ||
          new Date().toISOString(),
        isQuoted: !!el.querySelector('.quoted-message, [class*="quoted-"]'),
        quotedText:
          el
            .querySelector(
              '.quoted-message .selectable-text, [class*="quoted-"] [class*="text-"]'
            )
            ?.textContent?.trim() || null,
        isForwarded: !!el.querySelector(
          '[data-icon="forwarded"], [class*="forwarded-"]'
        ),
        hasMedia: !!el.querySelector(
          '[data-icon*="media-"], [class*="media-"], img, video, audio'
        ),
      };

      // Skip empty messages unless they have media
      if (message.text || message.hasMedia) {
        messages.push(message);
      }
    } catch (error) {
      console.error("[WhatsApp] Error processing message element:", error, el);
    }
  });

  console.log(`[WhatsApp] Extracted ${messages.length} messages`);
  return messages;
}
