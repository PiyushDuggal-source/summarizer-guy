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
      console.log("Fetching last, here with sender, ", msg.n, "messages...");
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

  chatElements.forEach((el, index) => {
    try {
      const unreadBadge = el.querySelector('span[aria-label*="unread"]');
      const unreadCountMatch = unreadBadge?.ariaLabel?.match(/(\d+)/);
      const unreadCount = unreadCountMatch
        ? parseInt(unreadCountMatch[1], 10)
        : 0;

      // Only process if there are unread messages or if it's a group chat
      if (unreadCount > 0) {
        const nameElement = el.querySelector("span[title]");
        const lastMessageElement = el.querySelector(
          '[data-testid="last-msg-status"], [data-testid="last-msg"]'
        );
        const timeElement = el.querySelector("time");
        const avatarElement = el.querySelector("img[src]");
        const isMuted = !!el.querySelector('[data-testid="muted"]');
        const isPinned = !!el.closest('[aria-label*="pinned"]');
        const isGroup = !!el.querySelector('[data-testid="group"]');
        const lastMessageTime = timeElement?.getAttribute("datetime") || "";

        if (nameElement) {
          // Create a unique selector for this group
          const groupName = nameElement.title || nameElement.textContent;
          const groupId = `group-${index}-${Date.now()}`;
          const groupSelector = `div[role="listitem"]:has(span[title="${groupName.replace(
            /"/g,
            '\\"'
          )}"])`;

          const groupInfo = {
            // Basic info
            id: groupId,
            name: groupName,
            unreadCount: unreadCount,
            selector: groupSelector, // Store the CSS selector instead of the element

            // Message info
            lastMessage: lastMessageElement?.textContent?.trim() || "",
            lastMessageTime: lastMessageTime,
            lastMessageTimestamp: lastMessageTime
              ? new Date(lastMessageTime).getTime()
              : 0,

            // Group metadata
            isGroup: isGroup,
            isMuted: isMuted,
            isPinned: isPinned,

            // Media and attachments
            hasUnreadMention: !!el.querySelector('[data-testid="mention"]'),
            hasMedia: !!el.querySelector(
              '[data-testid="media"], [data-testid*="media-"]'
            ),

            // Avatar info
            avatar: avatarElement?.src || "",
            avatarAlt: avatarElement?.alt || "",

            // Selectors for future reference
            selectors: {
              chatItem: 'div[role="listitem"]',
              unreadBadge: 'span[aria-label*="unread"]',
              nameElement: "span[title]",
              lastMessage: '[data-testid*="last-msg"]',
              timeElement: "time",
              avatar: "img[src]",
              muted: '[data-testid="muted"]',
              group: '[data-testid="group"]',
              mention: '[data-testid="mention"]',
              media: '[data-testid*="media"]',
            },
          };

          console.log(
            `Found group: ${groupInfo.name} with ${unreadCount} unread messages`
          );
          groups.push(groupInfo);
        }
      }
    } catch (error) {
      console.error("Error processing chat element:", error);
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

function extractTextWithEmojis(el) {
  let text = "";

  const textNode = el
    .querySelector(".selectable-text.copyable-text")
    .querySelector("span");

  textNode.childNodes.forEach((node) => {
    console.log("node", node);
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeName === "IMG" && node.alt) {
      text += node.alt; // emoji
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      text += extractTextWithEmojis(node); // recurse
    }
  });
  return text;
}

async function getLastNMessages(n) {
  console.log(`[WhatsApp] Fetching last ${n} messages...`);
  const messages = [];

  const messageElements = document.querySelectorAll("div[role='row']");

  const downArrowButton = document.querySelector(
    "button[aria-label='Scroll to bottom']"
  );

  if (downArrowButton) {
    console.log("[WhatsApp] Scrolling to bottom");
    chrome.runtime.sendMessage({
      action: "changeInfo",
      text: "Scrolling to bottom...",
    });
    new Promise((resolve) => setTimeout(resolve, 1000));
    downArrowButton.click();
    new Promise((resolve) => setTimeout(resolve, 1000));
    chrome.runtime.sendMessage({
      action: "changeInfo",
      text: "Done scrolling to bottom...",
    });
  }

  for (let i = messageElements.length - 1; i >= 0 && messages.length < n; i--) {
    const el = messageElements[i];

    try {
      const id = el.getAttribute("data-id") || `msg-${i}`;
      const timestamp =
        el.querySelector("time")?.getAttribute("datetime") ||
        new Date().toISOString();

      // Sender info (from data-pre-plain-text attribute)
      const meta =
        el
          .querySelector("[data-pre-plain-text]")
          ?.getAttribute("data-pre-plain-text") || "";
      const senderMatch = meta.match(/\]\s(.*?):/);
      const senderName = senderMatch ? senderMatch[1] : "Unknown";
      const senderNumber = ""; // not available

      // Quoted message
      let quotedMessage = null;
      const quotedContainer = el.querySelector(
        "div[role='button'][aria-label*='Quoted']"
      );
      if (quotedContainer) {
        quotedMessage = {
          sender: quotedContainer.innerText.split("\n")[0] || "Unknown",
          senderNumber: "",

          text: quotedContainer.innerText.split("\n").slice(1).join(" ") || "",
          // text:
          //   extractTextWithEmojis(quotedContainer)
          //     .split("\n")
          //     .slice(1)
          //     .join(" ")
          //     .trim() || "",
        };
      }

      // Full text extraction (with emojis)
      let text = extractTextWithEmojis(el).trim();

      // Remove quoted text if duplicated inside
      if (
        quotedMessage &&
        quotedMessage.text &&
        text.includes(quotedMessage.text)
      ) {
        text = text.replace(quotedMessage.text, "").trim();
      }

      // Remove sender prefix if duplicated
      if (senderName !== "Unknown" && text.startsWith(senderName)) {
        text = text.replace(senderName, "").trim();
      }

      // Remove trailing time (like "9:40 pm")
      text = text.replace(/\n?\d{1,2}:\d{2}\s?(am|pm)?$/i, "").trim();

      const isQuoted = !!quotedMessage;
      const isForwarded = !!el.querySelector("span[aria-label*='Forwarded']");
      const hasMedia = !!el.querySelector("img, video, audio");

      messages.push({
        id,
        text,
        sender: {
          name: senderName,
          number: senderNumber,
        },
        timestamp,
        isQuoted,
        quotedMessage,
        isForwarded,
        hasMedia,
      });
    } catch (err) {
      console.warn("[WhatsApp] Failed to parse message:", err);
    }
  }

  console.log("[WhatsApp] Fetched last", messages.length, "messages");

  return messages;
}
