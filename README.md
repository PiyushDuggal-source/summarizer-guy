# WhatsApp Group Chat Summarizer

A powerful Chrome extension that uses Google's Gemini AI to intelligently summarize WhatsApp group conversations. Stay on top of busy group chats with AI-powered summaries that extract key points and provide quick overviews.

<p align="center">
  <img src="https://github.com/piyushduggal-source/summarizer-guy/blob/main/images/example-image1.png?raw=true" alt="WA Group Summarizer - Main Interface" width="300" height="auto"/>
  <img src="https://github.com/piyushduggal-source/summarizer-guy/blob/main/images/example-image2.png?raw=true" alt="WA Group Summarizer - Main Interface" width="300" height="auto"/>
  <img src="https://github.com/piyushduggal-source/summarizer-guy/blob/main/images/example-image3.png?raw=true" alt="WA Group Summarizer - Main Interface" width="100%" height="auto"/>
</p>

## ✨ Features

### 🚀 Core Functionality

- **Smart Message Extraction**: Automatically extracts messages from active WhatsApp Web chats
- **Flexible Summarization**: Choose to summarize 50, 100, 200, or 300 recent messages
- **AI-Powered Analysis**: Uses Google's Gemini 2.0 Flash Lite model for intelligent summarization
- **Multi-Language Support**: Summarizes chats in any language and provides results in English
- **Real-time Processing**: Works on active WhatsApp Web sessions with live message extraction

### 🎯 User Experience

- **Intuitive Interface**: Clean, modern popup interface with easy-to-use controls
- **Quick Access**: One-click summarization from the extension popup
- **Copy & Save**: Copy summaries to clipboard and optionally save to local browser storage
- **Progress Indicators**: Real-time feedback during message extraction and AI processing
- **Responsive Design**: Works seamlessly across different screen sizes

### 🔒 Privacy & Security

- **Local Processing**: All message processing happens in your browser
- **No Data Collection**: We don't collect, store, or transmit your chat data
- **Secure API Calls**: Encrypted communication with Gemini API only
- **Local Storage**: Optional local saving of summaries (never synced to cloud)
- **No Tracking**: Zero analytics or usage data collection

### ⚙️ Customization

- **API Key Management**: Secure storage of your Gemini API key
- **Model Selection**: Choose your preferred Gemini AI model
- **Default Settings**: Configure default message count and save preferences
- **History Management**: View and manage locally saved summaries
- **Settings Persistence**: Your preferences sync across Chrome instances

## 🚀 Installation

### Step 1: Get Your Gemini API Key

1. **Visit Google AI Studio**

   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key" button
   - Choose "Create API Key in existing project" or create a new project
   - Copy your API key (starts with `AIza...`)

### Step 2: Install the Extension

#### Option A: Load Unpacked Extension (Recommended for Development)

1. Clone the repository

   ```bash
   git clone https://github.com/piyushduggal-source/summarizer-guy
   ```

2. Open Chrome Extensions page

   - In Chrome, go to `chrome://extensions/`

3. Enable Developer mode

   - Toggle the "Developer mode" switch in the top-right corner

4. Load the extension

   - Click "Load unpacked"
   - In the folder picker, select the `chrome-extension` directory inside the cloned repo

5. Verify installation
   - You should see "WA Group Summarizer" appear in the extensions list
   - Pin the extension to your toolbar for quick access

#### Option B: Download and Install

1. Download the extension files
2. Extract to a folder on your computer
3. Follow the same steps as Option A

### Step 3: Configure Your API Key

1. **Open Extension Options**

   - Right-click the extension icon in your toolbar
   - Select "Options" from the context menu

2. **Enter Your API Key**

   - Paste your Gemini API key in the "Gemini API Key" field
   - Choose your preferred default message count (50, 100, 200, or 300)
   - Optionally enable "Save summaries to local history"
   - Click "Save Settings"

3. **Verify Configuration**
   - The extension icon should now be active
   - You can test by opening WhatsApp Web and clicking the extension

## 📖 Usage Guide

### Basic Usage

1. **Open WhatsApp Web**

   - Navigate to [web.whatsapp.com](https://web.whatsapp.com)
   - Ensure you're in an active group chat

2. **Generate Summary**

   - Click the extension icon in your browser toolbar
   - Select the number of messages to summarize (50, 100, 200, or 300)
   - Click "Summarize Current Chat"
   - Wait for the AI to process and generate the summary

3. **Review Results**
   - Read the AI-generated summary
   - Copy the summary to clipboard if needed
   - Optionally save to local history

### Advanced Features

- **Message Count Selection**: Choose different message ranges for different summary depths
- **Local Storage**: Enable automatic saving of summaries for future reference
- **History Management**: Access previously saved summaries from the options page
- **Settings Customization**: Modify default behaviors and preferences

## 🏗️ Project Structure

```
chrome-extension/
├── manifest.json              # Extension configuration and permissions
├── background.js              # Service worker for background tasks
├── gemini.js                  # Gemini API integration and prompt engineering
├── content/
│   ├── content.js            # WhatsApp Web DOM interaction and message extraction
│   └── content.css           # Styling for injected content
├── popup/
│   ├── popup.html            # Main extension popup interface
│   ├── popup.js              # Popup logic and event handling
│   ├── popup.css             # Popup styling
│   └── messaging.js          # Communication with content scripts
├── options/
│   ├── options.html          # Settings and configuration page
│   └── options.js            # Options page logic
└── icons/                    # Extension icons (16x16 to 128x128)
```

## 🔧 Development

### Setting Up Development Environment

1. **Clone and Install**

   ```bash
   git clone https://github.com/yourusername/WA-grp-chat-summariser.git
   cd WA-grp-chat-summariser/chrome-extension
   ```

2. **Load in Chrome**

   - Open `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked extension from the `chrome-extension` directory

3. **Make Changes**
   - Edit files as needed
   - Reload the extension in Chrome to see changes
   - Use Chrome DevTools for debugging

### Key Development Files

- **`content/content.js`**: Main logic for WhatsApp Web interaction
- **`gemini.js`**: AI API integration and prompt engineering
- **`popup/popup.js`**: User interface logic
- **`options/options.js`**: Settings management

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### How to Contribute

1. **Fork the Repository**

   - Click the "Fork" button on GitHub
   - Clone your forked repository

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**

   - Implement your feature or fix
   - Add tests if applicable
   - Update documentation

4. **Submit a Pull Request**
   - Push your changes to your fork
   - Create a pull request with clear description
   - Wait for review and feedback

### Contribution Guidelines

- **Code Style**: Follow existing code patterns and formatting
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update README and code comments as needed
- **Issues**: Check existing issues before creating new ones
- **Communication**: Be respectful and constructive in discussions

### Areas for Contribution

- **UI/UX Improvements**: Better interfaces and user experience
- **Performance Optimization**: Faster message extraction and processing
- **New Features**: Additional summarization options or AI models
- **Bug Fixes**: Identify and fix issues
- **Documentation**: Improve guides and examples
- **Testing**: Add comprehensive test coverage

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Working

- **Check API Key**: Ensure your Gemini API key is correctly set in options
- **Verify Permissions**: Make sure the extension has necessary permissions
- **Reload WhatsApp**: Refresh the WhatsApp Web page after installing
- **Check Console**: Open DevTools (F12) and check for error messages

#### API Key Errors

- **Validate Key**: Ensure your API key is correct and active
- **Check Quota**: Verify you haven't exceeded your API quota
- **Network Issues**: Check your internet connection
- **Key Format**: API key should start with `AIza...`

#### Message Extraction Issues

- **Active Chat**: Ensure you're in an active group chat
- **Scroll Loading**: Try scrolling up to load more messages
- **Page Refresh**: Refresh the page if the interface seems stuck
- **Browser Compatibility**: Ensure you're using a supported browser

### Debug Mode

Enable debug logging by:

1. Opening the extension options
2. Right-clicking and selecting "Inspect"
3. Checking the console for detailed logs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI**: For providing the AI summarization capabilities
- **WhatsApp Web**: For the web interface that makes this extension possible
- **Chrome Extensions Team**: For the excellent extension platform
- **Open Source Community**: For inspiration and support

## ⚠️ Disclaimer

This extension is **not affiliated with, maintained, authorized, endorsed, or sponsored by**:

- WhatsApp Inc. (Meta Platforms, Inc.)
- Google LLC
- Any other company or organization

All product and company names are registered trademarks of their respective owners. This extension is an independent project created for educational and personal use purposes.

## 📞 Support

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Join community discussions
- **Documentation**: Check this README and code comments
- **Contributing**: Help improve the project

---

💡 **Pro Tip**: For the best experience, keep your browser and the extension updated to the latest versions. The extension works best with active, recent conversations and may take a few seconds to process longer message histories.

🌟 **Star this repository** if you find it helpful!

## 🖼️ Icons

The repository includes a vector source `icons/icon.svg`. To generate the required PNG sizes (16, 32, 48, 128) used by the extension:

1. Ensure Node.js is installed
2. Install the Sharp dependency locally:

   ```bash
   cd chrome-extension
   npm init -y
   npm install sharp --save-dev
   ```

3. Run the generator script:

   ```bash
   node scripts/generate-icons.js
   ```

This will output `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, and `icons/icon128.png`, which are referenced by `manifest.json`. If you replace `icon.svg`, re-run the script to update PNGs.
