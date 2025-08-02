# MCP Visual Tabs - Project Design Document

## Project Overview

**Goal**: Build a Model Context Protocol (MCP) server that enables AI assistants (like Cursor/Claude) to visually inspect, capture, and analyze any open browser tab. This tool runs entirely locally, giving developers the ability to reference any webpage for design inspiration, extract HTML/CSS, compare implementations, and manage localhost development environments through AI assistance.

**Core Value Proposition**: 
- "Look at this Stripe pricing page and help me build something similar"
- "Compare my localhost dashboard with this Notion page"
- "Extract the button styles from this design system"
- "Take a screenshot of my app and suggest improvements"

## Architecture Pattern: `useBrowserTools()`

### Standardized Interface Pattern
```typescript
// Clean, React-inspired API
const browserTools = useBrowserTools('chrome'); // or auto-detect
const tabs = await browserTools.listTabs();
const capture = await browserTools.screenshot(tabId);
```

### Core Interface Contract
Every browser provider must implement:
- `listTabs()` - Get all open tabs
- `screenshot(tabId)` - Capture tab visually  
- `captureHTML(tabId)` - Extract DOM content
- `captureCSS(tabId, selectors)` - Extract computed styles
- `navigateTab(tabId, url)` - Navigate to URL
- `extractElements(tabId, selectors)` - Get element details
- `getCapabilities()` - Report what this browser supports

## Project Structure

```
mcp-visual-tabs/
├── package.json                   # NPM package config, CLI binary
├── tsconfig.json                  # TypeScript configuration
├── DESIGN.md                      # This document
├── README.md                      # User documentation
├── src/
│   ├── index.ts                   # CLI entry point, argument parsing
│   ├── server.ts                  # MCP server implementation
│   ├── interfaces/
│   │   ├── browser-tools.ts       # Core BrowserTools interface
│   │   ├── types.ts               # TabInfo, CaptureOptions, etc.
│   │   └── capabilities.ts        # Browser capability definitions
│   ├── core/
│   │   ├── browser-factory.ts     # useBrowserTools() implementation
│   │   ├── capability-detector.ts # Auto-detect best browser
│   │   └── tab-manager.ts         # High-level orchestration
│   ├── browser-providers/
│   │   ├── base-provider.ts       # Abstract base class
│   │   ├── chrome-provider.ts     # Chrome DevTools Protocol
│   │   ├── safari-provider.ts     # WebKit Remote Inspector
│   │   ├── firefox-provider.ts    # Marionette/WebDriver
│   │   └── fallback-provider.ts   # Screen capture fallback
│   ├── capture/
│   │   ├── screenshot-engine.ts   # Cross-platform screenshots
│   │   ├── html-extractor.ts      # DOM content extraction
│   │   └── css-analyzer.ts        # Style computation and analysis
│   ├── platforms/
│   │   ├── macos.ts               # macOS-specific implementations
│   │   ├── windows.ts             # Windows-specific implementations
│   │   └── linux.ts               # Linux-specific implementations
│   └── utils/
│       ├── port-scanner.ts        # Find localhost development servers
│       ├── browser-detector.ts    # Detect installed browsers
│       └── config-manager.ts      # User preferences and settings
├── tests/
│   ├── unit/                      # Unit tests for each component
│   ├── integration/               # Cross-browser integration tests
│   └── fixtures/                  # Test HTML pages and mock data
└── docs/
    ├── browser-support.md         # Compatibility matrix
    ├── troubleshooting.md         # Common issues and solutions
    └── api-reference.md           # MCP tool documentation
```

## Key Technical Components

### 1. Browser Provider System
**Responsibility**: Implement browser-specific protocols while maintaining consistent API

**Chrome Provider** (Tier 1 - Full Support):
- Use Chrome DevTools Protocol (CDP) on port 9222
- Support: Chrome, Arc, Edge, Brave
- Full feature set: tab listing, remote screenshots, HTML/CSS extraction

**Safari Provider** (Tier 1 - macOS Only):
- Use WebKit Remote Inspector Protocol
- AppleScript integration for tab management
- Full feature set on macOS

**Firefox Provider** (Tier 2 - Limited):
- Use Marionette/WebDriver protocol
- More complex setup, limited remote access
- May fall back to screen capture

**Fallback Provider** (Tier 3 - Basic):
- Cross-platform screen capture
- Port scanning for localhost detection
- No remote browser control

### 2. Capability Detection System
**Responsibility**: Auto-detect available browsers and their capabilities

Key considerations:
- Test actual browser availability, not just installation
- Score browsers by feature completeness
- Handle browser updates that change protocol support
- Provide clear feedback on limitations

### 3. MCP Server Integration
**Responsibility**: Expose browser tools through standardized MCP protocol

Core MCP Tools:
- `list_tabs` - Show available browser tabs
- `capture_tab` - Screenshot + HTML + CSS extraction
- `compare_tabs` - Side-by-side tab comparison
- `extract_design_elements` - CSS pattern analysis
- `navigate_tab` - Browser navigation control

### 4. Cross-Platform Compatibility
**Responsibility**: Handle OS-specific browser launching and window management

Platform considerations:
- macOS: AppleScript, WebKit Inspector paths
- Windows: PowerShell, Chrome installation paths
- Linux: X11/Wayland, package manager variations

## Critical Implementation Considerations

### Privacy & Security
- **Entirely local execution** - no data leaves user's machine
- **Explicit user consent** - clear documentation about browser access
- **Secure defaults** - don't auto-enable dangerous features
- **Process isolation** - avoid interfering with user's browsing

### Browser Compatibility Strategy
- **Graceful degradation** - always provide some functionality
- **Clear capability reporting** - tell users what works
- **Version tolerance** - handle browser updates gracefully
- **Protocol stability** - abstract away browser-specific changes

### Performance & Resource Management
- **Lazy initialization** - don't launch browsers until needed
- **Connection pooling** - reuse browser connections efficiently
- **Memory management** - clean up screenshots and HTML captures
- **Timeout handling** - don't hang on unresponsive browsers

### User Experience
- **Zero configuration** - work out of the box when possible
- **Clear error messages** - help users fix setup issues
- **Progress feedback** - show what's happening during captures
- **Consistent behavior** - same commands work across browsers

## Edge Cases & Error Handling

### Browser Availability Issues
- **No supported browser installed**: Fall back to screen capture
- **Browser running but not accessible**: Clear setup instructions
- **Multiple browser instances**: Detect and choose active instance
- **Browser crashes during operation**: Reconnection strategies

### Network & Localhost Issues
- **Development server not running**: Helpful error messages
- **Port conflicts**: Scan multiple common ports
- **HTTPS/certificate issues**: Handle mixed content scenarios
- **Authentication required**: Document limitations and workarounds

### Platform-Specific Challenges
- **macOS sandboxing**: Handle permission dialogs gracefully
- **Windows UAC**: Avoid requiring administrator privileges
- **Linux display managers**: Support X11 and Wayland
- **Browser installation paths**: Handle non-standard locations

### Content Extraction Edge Cases
- **Dynamic content**: Handle JavaScript-rendered pages
- **Large pages**: Implement streaming for huge HTML/CSS
- **Iframes and shadow DOM**: Extract nested content properly
- **CORS restrictions**: Document limitations with cross-origin content

### MCP Protocol Considerations
- **Large screenshots**: Handle binary data efficiently
- **Connection timeouts**: Implement proper retry logic
- **Concurrent requests**: Handle multiple simultaneous captures
- **Tool parameter validation**: Robust input sanitization

## Development Phases

### Phase 1: Core Infrastructure
1. Set up project structure and build system
2. Implement BrowserTools interface and base provider
3. Create Chrome provider with basic screenshot capability
4. Build MCP server with single capture tool

### Phase 2: Multi-Browser Support
1. Add Safari provider for macOS users
2. Implement capability detection system
3. Add HTML and CSS extraction features
4. Create comprehensive test suite

### Phase 3: Advanced Features
1. Add tab comparison and design analysis tools
2. Implement Firefox provider (limited support)
3. Add fallback provider for unsupported browsers
4. Enhance error handling and user feedback

### Phase 4: Polish & Distribution
1. Comprehensive documentation and troubleshooting guides
2. Cross-platform testing and CI/CD setup
3. NPM package optimization and publishing
4. Community feedback integration

## Success Metrics

- **Browser Coverage**: Support 80%+ of developer browsers (Chrome, Safari, Arc)
- **Platform Coverage**: Work reliably on macOS, Windows, Linux
- **User Experience**: Zero-config installation for most users
- **Performance**: <2 second screenshot capture, <5 second HTML extraction
- **Reliability**: Graceful handling of 90%+ edge cases
- **Adoption**: Positive community feedback and active usage

This design prioritizes the developer experience while maintaining robust cross-platform compatibility and clear architectural boundaries.