# WhatsApp Group Chat Summarizer

This Chrome extension uses the Gemini API to summarize WhatsApp group chats.

## Features

- Summarize the last N messages in a group chat (50, 100, 200, or 300).
- Get a quick tl;dr and a list of key points.
- The summary is always in English, regardless of the chat language.
- Securely store your Gemini API key.
- Optionally save summaries to your local browser storage.

## How to Install

### Prerequisites
- Google Chrome browser (version 88 or later)
- Node.js and npm (for development)
- Google Gemini API key

### Setup

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key if you don't have one

2. **Install the Extension**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/WA-grp-chat-summariser.git
   cd WA-grp-chat-summariser/chrome-extension
   ```

3. **Configure Your API Key**
   - Open the extension options by right-clicking the extension icon and selecting "Options"
   - Enter your Gemini API key
   - Save your settings

4. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `chrome-extension` directory

## 🛠️ Development

### Project Structure

```
chrome-extension/
├── content/              # Content scripts that run on WhatsApp Web
│   └── content.js        # Handles DOM interaction and message extraction
├── icons/                # Extension icons
├── options/              # Options page
│   ├── options.html
│   └── options.js
├── popup/                # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── messaging.js      # Handles communication between popup and content scripts
├── gemini.js             # Gemini API client
├── manifest.json         # Extension manifest
└── README.md
```

### Building from Source

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the `dist` directory as an unpacked extension in Chrome

## 🤖 How It Works

1. **Message Extraction**:
   - The content script scans the WhatsApp Web interface
   - Identifies and extracts messages from the active chat
   - Handles various message types (text, media, quoted messages)

2. **AI Summarization**:
   - Messages are sent to Google's Gemini API
   - The AI generates a concise summary with key points
   - Results are formatted for easy reading

3. **User Interface**:
   - Clean popup shows groups with unread messages
   - Simple controls for generating and managing summaries
   - Options page for configuration

## 🔐 Privacy & Security

- **Local Processing**: All message processing happens in your browser
- **No Data Storage**: Your chat messages are never stored on our servers
- **Optional Local Storage**: Summaries are only saved if you explicitly choose to
- **Secure API Calls**: All communication with Gemini API is encrypted
- **No Tracking**: We don't collect any analytics or usage data

## 📝 Usage

1. Open WhatsApp Web in your browser
2. Click the extension icon in your toolbar
3. View your groups with unread messages
4. Click "Summarize" next to any group
5. Select the number of messages to include
6. View the AI-generated summary
7. Optionally save or copy the summary

## 🛠️ Troubleshooting

### Common Issues

1. **Extension not working on WhatsApp Web**
   - Ensure you're using the latest version of Chrome
   - Reload the WhatsApp Web page after installing the extension
   - Check the browser console for errors (right-click > Inspect > Console)

2. **API Key Errors**
   - Verify your Gemini API key in the extension options
   - Ensure you have sufficient quota in your Google Cloud account

3. **Message Extraction Issues**
   - Make sure you're in an active chat
   - Try scrolling up to load more messages before summarizing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by [Your Name]
- Uses Google's Gemini API for AI summarization
- Inspired by the need to stay on top of busy group chats

## ⚠️ Disclaimer

This extension is not affiliated with, maintained, authorized, endorsed, or sponsored by WhatsApp Inc. or Google LLC. All product and company names are the registered trademarks of their original owners. The use of any trade name or trademark is for identification and reference purposes only and does not imply any association with the trademark holder of their product brand.

---

💡 **Tip**: For the best experience, keep your Chrome browser and the extension updated to the latest versions.