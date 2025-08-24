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
      getLastNMessages(msg.n, msg.groupInfo).then((messages) => {
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

  chatElements.forEach((el, index) => {
    try {
      const unreadBadge = el.querySelector('span[aria-label*="unread"]');
      const unreadCountMatch = unreadBadge?.ariaLabel?.match(/(\d+)/);
      const unreadCount = unreadCountMatch ? parseInt(unreadCountMatch[1], 10) : 0;
      
      // Only process if there are unread messages or if it's a group chat
      if (unreadCount > 0) {
        const nameElement = el.querySelector("span[title]");
        const lastMessageElement = el.querySelector('[data-testid="last-msg-status"], [data-testid="last-msg"]');
        const timeElement = el.querySelector('time');
        const avatarElement = el.querySelector('img[src]');
        const isMuted = !!el.querySelector('[data-testid="muted"]');
        const isPinned = !!el.closest('[aria-label*="pinned"]');
        const isGroup = !!el.querySelector('[data-testid="group"]');
        const lastMessageTime = timeElement?.getAttribute('datetime') || '';
        
        if (nameElement) {
          // Create a unique selector for this group
          const groupName = nameElement.title || nameElement.textContent;
          const groupId = `group-${index}-${Date.now()}`;
          const groupSelector = `div[role="listitem"]:has(span[title="${groupName.replace(/"/g, '\\"')}"])`;
          
          const groupInfo = {
            // Basic info
            id: groupId,
            name: groupName,
            unreadCount: unreadCount,
            selector: groupSelector, // Store the CSS selector instead of the element
            
            // Message info
            lastMessage: lastMessageElement?.textContent?.trim() || '',
            lastMessageTime: lastMessageTime,
            lastMessageTimestamp: lastMessageTime ? new Date(lastMessageTime).getTime() : 0,
            
            // Group metadata
            isGroup: isGroup,
            isMuted: isMuted,
            isPinned: isPinned,
            
            // Media and attachments
            hasUnreadMention: !!el.querySelector('[data-testid="mention"]'),
            hasMedia: !!el.querySelector('[data-testid="media"], [data-testid*="media-"]'),
            
            // Avatar info
            avatar: avatarElement?.src || '',
            avatarAlt: avatarElement?.alt || '',
            
            // Selectors for future reference
            selectors: {
              chatItem: 'div[role="listitem"]',
              unreadBadge: 'span[aria-label*="unread"]',
              nameElement: 'span[title]',
              lastMessage: '[data-testid*="last-msg"]',
              timeElement: 'time',
              avatar: 'img[src]',
              muted: '[data-testid="muted"]',
              group: '[data-testid="group"]',
              mention: '[data-testid="mention"]',
              media: '[data-testid*="media"]'
            }
          };
          
          console.log(`Found group: ${groupInfo.name} with ${unreadCount} unread messages`);
          groups.push(groupInfo);
        }
      }
    } catch (error) {
      console.error('Error processing chat element:', error);
    }
  });

  // Sort by unread count (descending) and then by last message time (newest first)
  return groups.sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0);
  });
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

async function getLastNMessages(n, groupInfo = null) {
  console.log(`[WhatsApp] Fetching last ${n} messages...`);
  const messages = new Map();

  console.log("[WhatsApp] Group info:", groupInfo)
  
  // If groupInfo is provided and contains a selector, find and click the element
  if (groupInfo && groupInfo.selector) {
    console.log(`[WhatsApp] Opening chat for ${groupInfo.name}...`);
    try {
      // Find the element using the stored selector
      const groupElement = document.querySelector(groupInfo.selector);

      console.log("Group element:", groupElement)
      if (groupElement) {
        console.log("Group element found")
        // Scroll the element into view and click it
        groupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for scroll
        groupElement.click();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for chat to load
      } else {
        console.warn(`[WhatsApp] Could not find group element with selector: ${groupInfo.selector}`);
      }
    } catch (error) {
      console.error('[WhatsApp] Error opening chat:', error);
    }
  }

  // Try multiple selectors for the message container with retries
  const containerSelectors = [
    // Modern WhatsApp Web
    'div[data-testid="conversation-panel-messages"]',
    'div[role="log"]',
    // Fallback selectors
    'div[data-testid="msg-container"]',
    'div[class*="message-"]',
    'div[class*="msg-"]',
    'div[class*="conversation-"]',
    'div[class*="chat-"]',
    'div[class*="pane-body"]',
    'div[class*="pane-body"] > div',
    'div[class*="pane-body"] > div > div',
    'div[class*="pane-body"] > div > div > div'
  ];
  
  let messageContainer = null;
  const maxAttempts = 3;
  let attempts = 0;
  
  // Try to find the message container with retries
  while (!messageContainer && attempts < maxAttempts) {
    for (const selector of containerSelectors) {
      messageContainer = document.querySelector(selector);
      if (messageContainer) {
        console.log(`Found message container with selector: ${selector}`);
        break;
      }
    }
    
    if (!messageContainer) {
      attempts++;
      console.log(`[WhatsApp] Message container not found, retrying (${attempts}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
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

  if (!messageContainer) {
    console.error('[WhatsApp] Message container not found after all attempts');
    return [];
  }

  let lastMessageCount = 0;
  let stableScrolls = 0;
  const maxStableScrolls = 3; // Stop after 3 scrolls with no new messages
  const scrollStep = 500; // Pixels to scroll each time
  let scrollPosition = 0;
  const maxScrolls = 20; // Maximum number of scroll attempts
  let scrollCount = 0;

  // First, try to load some messages by scrolling up
  while (scrollCount < maxScrolls && messages.size < n) {
    // Scroll up to load more messages
    messageContainer.scrollTop = scrollPosition;
    await new Promise(resolve => setTimeout(resolve, 800)); // Wait for messages to load
    
    // Get visible messages
    const visibleMessages = getVisibleMessages();
    let newMessagesFound = false;
    
    // Add new messages to our map
    visibleMessages.forEach((msg) => {
      if (!messages.has(msg.id)) {
        messages.set(msg.id, msg);
        newMessagesFound = true;
      }
    });

    console.log(`[WhatsApp] Found ${visibleMessages.length} messages, ${messages.size} unique so far`);
    
    // Check if we've found enough messages
    if (messages.size >= n) {
      console.log(`[WhatsApp] Found requested ${n} messages`);
      break;
    }
    
    // Update scroll position for next iteration
    scrollPosition += scrollStep;
    
    // Check if we've reached the top
    if (messageContainer.scrollTop === 0) {
      console.log('[WhatsApp] Reached the top of the chat');
      break;
    }
    
    // Check if we're not making progress
    if (!newMessagesFound) {
      stableScrolls++;
      if (stableScrolls >= maxStableScrolls) {
        console.log(`[WhatsApp] No new messages found after ${stableScrolls} attempts, stopping`);
        break;
      }
    } else {
      stableScrolls = 0; // Reset counter if we found new messages
    }
    
    scrollCount++;
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
