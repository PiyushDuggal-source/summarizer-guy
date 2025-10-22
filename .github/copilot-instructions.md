# Copilot Instructions for WA Group Summarizer Chrome Extension

## Project Overview

- **Purpose:** Summarize WhatsApp Web group chats using Google Gemini AI, via a Chrome Extension (Manifest V3).
- **Architecture:**
  - **Content Script (`content/content.js`):** Injected into WhatsApp Web, scrapes messages, scrolls chat, and extracts message data.
  - **Side Panel UI (`sidepanel/`):** Main user interface for summarization, API key entry, and summary display.
  - **Popup UI (`popup/`):** Alternative interface, similar logic to side panel.
  - **Options Page (`options/`):** Settings and summary history management.
  - **Background (`background.js`):** Minimal service worker, opens side panel on extension click.
  - **Gemini API Integration (`gemini.js`):** Handles prompt engineering and API calls to Google Gemini.
  - **Messaging Modules (`popup/messaging.js`, `sidepanel/messaging.js`):** Abstract Chrome message passing between UI and content script.

## Key Workflows

- **Summarization Flow:**
  1. User triggers summarization from UI (side panel or popup).
  2. UI calls `getLastNMessages(n)` via messaging module.
  3. Content script scrapes messages, returns array to UI.
  4. UI passes messages to `gemini.js` for prompt construction and API call.
  5. Summary is displayed in UI; user can copy or save it locally.
- **Settings & History:**
  - API key and preferences stored in `chrome.storage.sync`.
  - Summaries saved in `chrome.storage.local`.
  - Options page allows editing settings and managing saved summaries.

## Project-Specific Patterns & Conventions

- **Message Extraction:**
  - Always use the provided helper (`getLastNMessages`) for scraping; do not duplicate DOM logic.
  - Message objects include sender, text, timestamp, quoted/forwarded/media flags.
- **Prompt Engineering:**
  - Prompts for Gemini are built in `gemini.js` and always request: TL;DR, key points (bullets), and links.
  - Output is expected as a single string; parsing is minimal.
- **UI/UX:**
  - Side panel is the primary interface; popup is a fallback.
  - API key setup is required before use; guide user to Google AI Studio if missing.
  - All summaries are shown in English, regardless of chat language.
- **Storage:**
  - Use `chrome.storage.sync` for settings, `chrome.storage.local` for summary history.
  - Never store user messages or API keys outside browser storage.
- **Error Handling:**
  - Show clear error messages in UI if scraping fails, API key is missing, or Gemini returns an error.
  - If WhatsApp Web is not open, prompt user accordingly.

## Development & Debugging

- **Live Reload:** Reload extension in Chrome after code changes.
- **Icon Generation:** Use `node scripts/generate-icons.js` (requires `sharp` npm package) to regenerate PNG icons from `icons/icon.svg`.
- **Testing:** No automated tests; manual testing via Chrome is standard.
- **Debug Logging:** Use `console.log` for debugging; inspect via DevTools in extension pages.

## Integration Points

- **External:**
  - Google Gemini API (requires user-provided API key)
  - WhatsApp Web DOM (selectors may break if WhatsApp updates UI)
- **Internal:**
  - All cross-component communication uses Chrome extension messaging APIs.

## Examples

- To add a new summarization option, update UI radio buttons and ensure `getLastNMessages` supports the new value.
- To change prompt structure, edit `createPrompt` in `gemini.js`.
- To add a new setting, update `options/options.html` and `options/options.js`, and persist via `chrome.storage.sync`.

---

**For more details, see:**

- `README.md` (user/developer guide)
- `description.txt` (project rationale and architecture)
- `manifest.json` (permissions and entry points)
- Key modules: `content/content.js`, `sidepanel/sidepanel.js`, `gemini.js`, `options/options.js`
