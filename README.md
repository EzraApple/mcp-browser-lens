# mcp-browser-lens

**MCP server providing AI assistants visual access to browser tabs** - capture screenshots, extract HTML/CSS, and analyze designs from any open tab for development and inspiration.

Turn any webpage into AI context: "Look at this Stripe pricing page and help me build something similar" or "Compare my localhost dashboard with this Notion page design".

## Features

### 🖼️ Visual Browser Access
- **Screenshot Capture**: High-quality screenshots of any browser tab
- **Live Tab Inspection**: See exactly what's in any open browser tab
- **Design Analysis**: Let AI analyze layouts, color schemes, and component patterns

### 🔍 Content Extraction  
- **HTML Extraction**: Pull clean HTML structure from any page
- **CSS Analysis**: Extract computed styles and design systems
- **Element Details**: Get detailed info about specific page elements using CSS selectors

### 🎯 Smart Navigation
- **Tab Management**: List, switch between, and capture specific tabs
- **Page Scrolling**: Scroll to specific elements or positions for better captures
- **Safe Tab Switching**: Switch tabs without unwanted navigation

### 🛠️ Developer-Focused
- **Localhost Support**: Perfect for capturing your local development environments
- **Design Inspiration**: Analyze production sites to inform your own designs  
- **Component Extraction**: Pull specific UI patterns and styles for reference

## Quick Start

### 1. Clone and Build

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-browser-lens.git
cd mcp-browser-lens

# Install dependencies and build
npm install
npm run build

# Get the absolute path for MCP config
pwd
# Copy this path - you'll need it for step 3
```

### 2. Start Chrome with Debugging

**Every time you want to use mcp-browser-lens**, start Chrome with remote debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-mcp

# Windows  
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=%TEMP%\chrome-debug-mcp

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-mcp
```

> **💡 Pro tip**: Create an alias or script for this command since you'll use it frequently during development.

### 3. Add to MCP Configuration

Add this to your `mcp.json` configuration file (replace `YOUR_PROJECT_PATH` with the path from step 1):

```json
{
  "mcpServers": {
    "mcp-browser-lens": {
      "command": "node",
      "args": ["YOUR_PROJECT_PATH/mcp-browser-lens/dist/index.js"],
      "env": {}
    }
  }
}
```

### 4. Start Using in Your AI Assistant

Once configured, you can use commands like:

- *"Take a screenshot of my localhost:3000 dashboard"*
- *"Extract the CSS for the navigation bar on this design system page"*  
- *"Show me all the open tabs and capture the Stripe pricing page"*
- *"Get the HTML structure of this component library page"*

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_tabs` | List all open browser tabs with titles and URLs |
| `capture_screenshot` | Take high-quality screenshots of specific tabs |
| `capture_page_content` | Extract HTML and CSS content from pages |  
| `extract_elements` | Get detailed element information using CSS selectors |
| `scroll_page` | Scroll pages (pixels, viewport, to elements, top/bottom) |
| `set_active_tab` | Switch to a specific tab safely |
| `get_browser_capabilities` | Check what browser features are available |

## Browser Support

### ✅ Currently Supported
- **Chrome/Chromium** - Full support via DevTools Protocol

### 🔄 Coming Soon  
- **Safari** - WebKit Remote Inspector integration
- **Firefox** - Gecko debugging protocol support
- **Arc Browser** - Chromium-based support

## System Requirements

- **Node.js** 18.0.0 or higher
- **Chrome/Chromium** with remote debugging support
- **macOS, Windows, or Linux**

## Troubleshooting

### Chrome Not Detected
1. Make sure Chrome is started with the `--remote-debugging-port=9222` flag
2. Check that nothing else is using port 9222: `lsof -i :9222` (macOS/Linux)
3. Try restarting Chrome with debugging enabled

### Permission Issues
- Make sure the temporary user data directory has write permissions
- On macOS, you may need to grant Terminal access to control Chrome

### Connection Timeouts
- Ensure Chrome is fully loaded before running MCP commands
- Try refreshing the page if extraction seems stuck

## Next Steps

### 📦 NPM Publishing (Coming Soon)
Once published to NPM, setup will be much simpler - no cloning or building required!

**Future mcp.json configuration**:
```json
{
  "mcpServers": {
    "mcp-browser-lens": {
      "command": "npx",
      "args": ["-y", "mcp-browser-lens"]
    }
  }
}
```

This will:
- Pull the latest version directly from NPM
- Eliminate the need to clone and build locally  
- Always use the most up-to-date version
- Work the same way as other NPM-based MCP servers

### 🌐 Multi-Browser Support
Expanding beyond Chrome to provide universal browser access:

- **Safari Integration** - Native macOS WebKit support
- **Firefox Support** - Gecko debugging protocol integration  
- **Cross-Platform** - Windows and Linux browser support
- **Browser Auto-Detection** - Automatically find and use available browsers

