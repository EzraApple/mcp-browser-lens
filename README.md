# 🔍 MCP Browser Lens

**AI-powered browser automation and visual inspection** - Give your AI assistant eyes to see, capture, and analyze any webpage. Zero setup required with automatic Chrome integration.

Turn any webpage into AI context instantly: *"Look at this Stripe pricing page and help me build something similar"* or *"Compare my localhost dashboard with this Notion page design"*.

## ✨ Features

### 🚀 **Zero Configuration Setup**
- **Auto-Launch Chrome**: Automatically starts Chrome with debugging if not running
- **Welcome Page**: Beautiful onboarding page explaining all capabilities  
- **Instant Ready**: No manual Chrome setup - just restart your AI assistant

### 🖼️ **Visual Browser Access**
- **Screenshot Capture**: High-quality screenshots of any browser tab
- **Live Tab Inspection**: See exactly what's in any open browser tab
- **Design Analysis**: Let AI analyze layouts, color schemes, and component patterns

### 🔍 **Content Extraction**  
- **HTML Extraction**: Pull clean HTML structure from any page
- **CSS Analysis**: Extract computed styles and design systems
- **Element Details**: Get detailed info about specific page elements using CSS selectors

### 🎯 **Smart Navigation & Control**
- **Tab Management**: List, switch between, and capture specific tabs
- **Page Scrolling**: Scroll to specific elements or positions for better captures
- **Safe Tab Switching**: Switch tabs without unwanted navigation

### 🛠️ **Developer-Focused**
- **Localhost Support**: Perfect for capturing your local development environments
- **Design Inspiration**: Analyze production sites to inform your own designs  
- **Component Extraction**: Pull specific UI patterns and styles for reference

## 🚀 Quick Start

### 1. **Clone and Build**

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-browser-lens.git
cd mcp-browser-lens

# Install dependencies and build
npm install
npm run build

# Get the absolute path for MCP config
pwd
# Copy this path - you'll need it for step 2
```

### 2. **Add to MCP Configuration**

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

### 3. **Restart Your AI Assistant**

That's it! When you restart your AI assistant (Cursor, etc.):

✅ **MCP Browser Lens will automatically:**
- Detect if Chrome is running with debugging
- Launch Chrome with debugging enabled if needed  
- Open a beautiful welcome page explaining all capabilities
- Be ready for AI commands immediately

## 💬 Example AI Commands

Once configured, you can use natural language commands like:

```
"Take a screenshot of this page and suggest design improvements"

"Show me all my open tabs and summarize what's in each one"

"Extract the main navigation elements from this website"

"Compare this page layout with the Stripe pricing page"

"Help me debug the CSS issues on my localhost development site"

"Capture the checkout flow from this e-commerce site"

"Get the color palette and typography from this design system"
```

## 🛠️ Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_tabs` | List all open browser tabs with titles and URLs |
| `capture_screenshot` | Take high-quality screenshots of specific tabs |
| `capture_page_content` | Extract HTML and CSS content from pages |  
| `extract_elements` | Get detailed element information using CSS selectors |
| `scroll_page` | Scroll pages (pixels, viewport, to elements, top/bottom) |
| `set_active_tab` | Switch to a specific tab safely |
| `get_browser_capabilities` | Check what browser features are available |

## 🌐 Browser Support

### ✅ **Currently Supported**
- **Chrome/Chromium** - Full support with auto-launch and zero configuration

### 🔄 **Future Support** (Optional)
- **Safari** - WebKit Remote Inspector integration (complex setup)
- **Firefox/Zen** - Gecko debugging protocol support (different architecture)
- **Arc Browser** - Chromium-based support (should work with Chrome provider)

> **Note**: Chrome provides the best debugging experience and widest compatibility. Other browsers may be added based on user demand, but Chrome-first ensures the most reliable experience.

## 🖥️ System Requirements

- **Node.js** 18.0.0 or higher
- **Google Chrome** (any recent version)
- **macOS, Windows, or Linux**

## 🔧 Troubleshooting

### 🚫 **Chrome Auto-Launch Issues**

**Problem**: Chrome doesn't launch automatically
```bash
# Check if Chrome is installed in standard locations:
ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Or try manual launch:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Problem**: Permission denied when launching Chrome
- On macOS, grant Terminal permission to control applications in System Preferences → Security & Privacy

### 🔌 **Connection Issues**

**Problem**: "Browser not detected" errors
1. Check Chrome debugging port: `curl http://localhost:9222/json/version`
2. Restart your AI assistant to trigger auto-launch
3. Manually quit Chrome (Cmd+Q) and let MCP relaunch it

**Problem**: Tabs not showing up
- Make sure Chrome is the active application
- Try refreshing the webpage
- Check that you have tabs actually open in Chrome

### ⚡ **Performance Issues**

**Problem**: Slow screenshot capture
- Close unnecessary browser tabs
- Ensure localhost development servers are responsive
- Try smaller screenshot areas using element selectors

## 🎯 Best Practices

### **For Web Development**
- Keep your localhost development server running
- Use descriptive tab titles for easier AI identification
- Open design inspiration in separate tabs for comparison

### **For Design Analysis**
- Navigate to the specific page/component before asking for analysis
- Use element extraction for specific UI components
- Take screenshots at different scroll positions for full page capture

### **For Content Research**
- Open multiple related pages for comparative analysis
- Use tab listing to let AI understand your research context
- Combine screenshots with HTML extraction for comprehensive understanding

## 🚀 What's Next?

### 📦 **NPM Publishing** (Coming Soon)
Once published to NPM, setup will be even simpler:

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

This will eliminate the need to clone and build locally!

### 🔮 **Future Enhancements**
- **Multi-tab Screenshots**: Capture multiple tabs simultaneously
- **Video Recording**: Record interactions and page changes
- **Enhanced Element Detection**: AI-powered element recognition
- **Design System Analysis**: Automatic component library extraction
- **Performance Monitoring**: Page load and interaction metrics

---

## 🆘 Need Help?

- **Check the welcome page**: Opens automatically in Chrome with detailed explanations
- **Review logs**: Your AI assistant console shows detailed MCP operation logs
- **Test basic connection**: Try `"List my browser tabs"` first to verify everything works

**Happy browsing with AI! 🎉**