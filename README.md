# 🔍 MCP Browser Lens

**AI-powered browser automation and visual inspection** - Give your AI assistant eyes to see, capture, and analyze any webpage. One-line installation with automatic Chrome integration.

Turn any webpage into AI context instantly: *"Look at this Stripe pricing page and help me build something similar"* or *"Compare my localhost dashboard with this Notion page design"*.

## 🚀 **One-Line Installation**

Just add this to your `mcp.json` and restart your AI assistant:

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

**That's it!** No cloning, no building, no setup required.

## ⚡ **What Happens Next?**

When you restart your AI assistant (Cursor, etc.):

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

## 👩‍💻 **Development & Contributing**

Want to contribute or run locally? 

```bash
# Clone and setup
git clone https://github.com/EzraApple/mcp-browser-lens.git
cd mcp-browser-lens
npm install
npm run build
```

Then use the local version in your `mcp.json`:

```json
{
  "mcpServers": {
    "mcp-browser-lens": {
      "command": "node",
      "args": ["/path/to/mcp-browser-lens/dist/index.js"]
    }
  }
}
```

## 🚀 What's Next?

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