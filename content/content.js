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
  try {
    // Look for the group container
    const groupElement = document.querySelector(
      'div[role="button"][data-tab="6"]'
    );
    if (!groupElement) {
      console.warn("No group element found");
      return null;
    }

    // First check for span with title (members usually show here)
    const memberElement = groupElement.querySelector("span[title]");

    // Then check for span without title (group name usually here)
    const nameElement = groupElement.querySelector("span:not([title])");

    if (nameElement) {
      const name = nameElement.textContent.trim();
      return {
        id: name.replace(/\s+/g, "_").toLowerCase(),
        name: name,
        members: memberElement ? memberElement.getAttribute("title") : null,
      };
    }

    console.warn("Could not find group name");
    return null;
  } catch (error) {
    console.error("Error in getCurrentGroupInfo:", error);
    return null;
  }
}

function extractTextWithEmojis(el) {
  let text = "";

  const textNode = el
    .querySelector(".selectable-text.copyable-text")
    .querySelector("span");

  textNode.childNodes.forEach((node) => {
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

// async function getLastNMessages(n) {
//   console.log(`[WhatsApp] Fetching last ${n} messages...`);
//   const messages = [];

//   const messageElements = document.querySelectorAll("div[role='row']");

//   const downArrowButton = document.querySelector(
//     "button[aria-label='Scroll to bottom']"
//   );

//   if (downArrowButton) {
//     console.log("[WhatsApp] Scrolling to bottom");
//     chrome.runtime.sendMessage({
//       action: "changeInfo",
//       text: "Scrolling to bottom...",
//     });
//     new Promise((resolve) => setTimeout(resolve, 1000));
//     downArrowButton.click();
//     new Promise((resolve) => setTimeout(resolve, 1000));
//     chrome.runtime.sendMessage({
//       action: "changeInfo",
//       text: "Done scrolling to bottom...",
//     });
//   }

//   for (let i = messageElements.length - 1; i >= 0 && messages.length < n; i--) {
//     const el = messageElements[i];

//     try {
//       const id = el.getAttribute("data-id") || `msg-${i}`;
//       const timestamp =
//         el.querySelector("time")?.getAttribute("datetime") ||
//         new Date().toISOString();

//       // Sender info (from data-pre-plain-text attribute)
//       const meta =
//         el
//           .querySelector("[data-pre-plain-text]")
//           ?.getAttribute("data-pre-plain-text") || "";
//       const senderMatch = meta.match(/\]\s(.*?):/);
//       const senderName = senderMatch ? senderMatch[1] : "Unknown";
//       const senderNumber = ""; // not available

//       // Quoted message
//       let quotedMessage = null;
//       const quotedContainer = el.querySelector(
//         "div[role='button'][aria-label*='Quoted']"
//       );
//       if (quotedContainer) {
//         quotedMessage = {
//           sender: quotedContainer.innerText.split("\n")[0] || "Unknown",
//           senderNumber: "",

//           text: quotedContainer.innerText.split("\n").slice(1).join(" ") || "",
//           // text:
//           //   extractTextWithEmojis(quotedContainer)
//           //     .split("\n")
//           //     .slice(1)
//           //     .join(" ")
//           //     .trim() || "",
//         };
//       }

//       // Full text extraction (with emojis)
//       let text = extractTextWithEmojis(el).trim();

//       // Remove quoted text if duplicated inside
//       if (
//         quotedMessage &&
//         quotedMessage.text &&
//         text.includes(quotedMessage.text)
//       ) {
//         text = text.replace(quotedMessage.text, "").trim();
//       }

//       // Remove sender prefix if duplicated
//       if (senderName !== "Unknown" && text.startsWith(senderName)) {
//         text = text.replace(senderName, "").trim();
//       }

//       // Remove trailing time (like "9:40 pm")
//       text = text.replace(/\n?\d{1,2}:\d{2}\s?(am|pm)?$/i, "").trim();

//       const isQuoted = !!quotedMessage;
//       const isForwarded = !!el.querySelector("span[aria-label*='Forwarded']");
//       const hasMedia = !!el.querySelector("img, video, audio");

//       messages.push({
//         id,
//         text,
//         sender: {
//           name: senderName,
//           number: senderNumber,
//         },
//         timestamp,
//         isQuoted,
//         quotedMessage,
//         isForwarded,
//         hasMedia,
//       });
//     } catch (err) {
//       console.warn("[WhatsApp] Failed to parse message:", err);
//     }
//   }

//   console.log("[WhatsApp] Fetched last", messages.length, "messages");

//   chrome.runtime.sendMessage({
//     action: "changeInfo",
//     text:
//       "Done fetching messages..., " + messages.length + " messages fetched.",
//   });

//   return messages;
// }

// async function getLastNMessages(n) {
//   console.log(`[WhatsApp] Fetching last ${n} messages...`);
//   const messages = [];

//   // Chat container (where messages are loaded)
//   const chatContainer = document.querySelector(
//     "div[role='application'] main div[role='region']"
//   );
//   if (!chatContainer) {
//     console.warn("[WhatsApp] Chat container not found");
//     return [];
//   }

//   // Helper to wait
//   const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//   // Keep scrolling up until enough messages are loaded
//   let messageElements = document.querySelectorAll("div[role='row']");
//   while (messageElements.length < n) {
//     console.log("[WhatsApp] Not enough messages, scrolling up...");
//     chrome.runtime.sendMessage({
//       action: "changeInfo",
//       text: `Scrolling up... loaded ${messageElements.length}/${n}`,
//     });

//     // Scroll up programmatically
//     chatContainer.scrollTop = 0;
//     await sleep(1500); // wait for messages to load

//     // Re-check messages
//     messageElements = document.querySelectorAll("div[role='row']");

//     // Break if no new messages are loaded (end of chat)
//     if (messageElements.length >= n || chatContainer.scrollTop === 0) {
//       break;
//     }
//   }

//   // If more than n messages, pick last n
//   const selectedMessages = Array.from(messageElements).slice(-n);

//   for (let i = 0; i < selectedMessages.length; i++) {
//     const el = selectedMessages[i];
//     try {
//       const id = el.getAttribute("data-id") || `msg-${i}`;
//       const timestamp =
//         el.querySelector("time")?.getAttribute("datetime") ||
//         new Date().toISOString();

//       const meta =
//         el
//           .querySelector("[data-pre-plain-text]")
//           ?.getAttribute("data-pre-plain-text") || "";
//       const senderMatch = meta.match(/\]\s(.*?):/);
//       const senderName = senderMatch ? senderMatch[1] : "Unknown";

//       let quotedMessage = null;
//       const quotedContainer = el.querySelector(
//         "div[role='button'][aria-label*='Quoted']"
//       );
//       if (quotedContainer) {
//         quotedMessage = {
//           sender: quotedContainer.innerText.split("\n")[0] || "Unknown",
//           senderNumber: "",
//           text: quotedContainer.innerText.split("\n").slice(1).join(" ") || "",
//         };
//       }

//       let text = extractTextWithEmojis(el).trim();

//       if (
//         quotedMessage &&
//         quotedMessage.text &&
//         text.includes(quotedMessage.text)
//       ) {
//         text = text.replace(quotedMessage.text, "").trim();
//       }

//       if (senderName !== "Unknown" && text.startsWith(senderName)) {
//         text = text.replace(senderName, "").trim();
//       }

//       text = text.replace(/\n?\d{1,2}:\d{2}\s?(am|pm)?$/i, "").trim();

//       const isQuoted = !!quotedMessage;
//       const isForwarded = !!el.querySelector("span[aria-label*='Forwarded']");
//       const hasMedia = !!el.querySelector("img, video, audio");

//       messages.push({
//         id,
//         text,
//         sender: {
//           name: senderName,
//           number: "",
//         },
//         timestamp,
//         isQuoted,
//         quotedMessage,
//         isForwarded,
//         hasMedia,
//       });
//     } catch (err) {
//       console.warn("[WhatsApp] Failed to parse message:", err);
//     }
//   }

//   console.log("[WhatsApp] Fetched last", messages.length, "messages");
//   chrome.runtime.sendMessage({
//     action: "changeInfo",
//     text:
//       "Done fetching messages..., " + messages.length + " messages fetched.",
//   });

//   return messages;
// }

async function getLastNMessages(n) {
  console.log(`[WhatsApp] Fetching last ${n} messages...`);
  const messages = [];

  const chatContainer = document.querySelector(
    ".copyable-area>div[tabindex='0']"
  ); // main chat scroll container
  if (!chatContainer) {
    console.warn("[WhatsApp] Chat container not found!");
    return [];
  }

  function extractMessages() {
    return Array.from(document.querySelectorAll("div[role='row']"));
  }

  let messageElements = extractMessages();

  // keep scrolling until enough messages are loaded
  while (messageElements.length < n) {
    console.log(
      `[WhatsApp] Currently ${messageElements.length}, need ${n}. Scrolling up...`
    );

    chrome.runtime.sendMessage({
      action: "changeInfo",
      text: `Scrolling up... loaded ${messageElements.length}/${n}`,
    });

    let prevHeight = chatContainer.scrollHeight;
    chatContainer.scrollTo(0, 0);

    // flag: wait until new messages are actually loaded
    await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        let newHeight = chatContainer.scrollHeight;
        if (newHeight > prevHeight) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(chatContainer, { childList: true, subtree: true });
    });

    messageElements = extractMessages();
  }

  // If more than n, just take last n
  const neededMessages = messageElements.slice(-n);

  for (let i = neededMessages.length - 1; i >= 0; i--) {
    const el = neededMessages[i];
    try {
      const id = el.getAttribute("data-id") || `msg-${i}`;
      const timestamp =
        el.querySelector("time")?.getAttribute("datetime") ||
        new Date().toISOString();

      const meta =
        el
          .querySelector("[data-pre-plain-text]")
          ?.getAttribute("data-pre-plain-text") || "";
      const senderMatch = meta.match(/\]\s(.*?):/);
      const senderName = senderMatch ? senderMatch[1] : "Unknown";

      let quotedMessage = null;
      const quotedContainer = el.querySelector(
        "div[role='button'][aria-label*='Quoted']"
      );
      if (quotedContainer) {
        quotedMessage = {
          sender: quotedContainer.innerText.split("\n")[0] || "Unknown",
          senderNumber: "",
          text: quotedContainer.innerText.split("\n").slice(1).join(" ") || "",
        };
      }

      let text = extractTextWithEmojis(el).trim();

      if (
        quotedMessage &&
        quotedMessage.text &&
        text.includes(quotedMessage.text)
      ) {
        text = text.replace(quotedMessage.text, "").trim();
      }

      if (senderName !== "Unknown" && text.startsWith(senderName)) {
        text = text.replace(senderName, "").trim();
      }

      text = text.replace(/\n?\d{1,2}:\d{2}\s?(am|pm)?$/i, "").trim();

      messages.push({
        id,
        text,
        sender: { name: senderName, number: "" },
        timestamp,
        isQuoted: !!quotedMessage,
        quotedMessage,
        isForwarded: !!el.querySelector("span[aria-label*='Forwarded']"),
        hasMedia: !!el.querySelector("img, video, audio"),
      });
    } catch (err) {
      console.warn("[WhatsApp] Failed to parse message:", err);
    }
  }

  console.log("[WhatsApp] Fetched last", messages.length, "messages");

  chrome.runtime.sendMessage({
    action: "changeInfo",
    text: `Done fetching messages..., ${messages.length} messages fetched.`,
  });

  return messages;
}
