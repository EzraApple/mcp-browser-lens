# MCP Visual Tabs - Project Design Document

## Project Overview

**Goal**: Build a Model Context Protocol (MCP) server that enables AI assistants (like Cursor/Claude) to visually inspect, capture, and analyze any open browser tab. This tool runs entirely locally, giving developers the ability to reference any webpage for design inspiration, extract HTML/CSS, compare implementations, and manage localhost development environments through AI assistance.

**Core Value Proposition**: 
- "Look at this Stripe pricing page and help me build something similar"
- "Compare my localhost dashboard with this Notion page"
- "Extract the button styles from this design system"
- "Take a screenshot of my app and suggest improvements"

**Development-First Approach**:
- Test MCP tools directly in Cursor during development
- Inspect captured outputs locally in `captured/` directory  
- Focus on **Chrome first**: Perfect Chrome DevTools Protocol integration before expanding
- Complete all 7 MCP tools with Chrome before moving to other browsers

## Code Practices & Standards

### TypeScript Best Practices
- **Strict typing**: No use of `any` type - define explicit types and interfaces
- **Type definitions**: Create comprehensive type definitions in `interfaces/types.ts`
- **Null safety**: Use strict null checks and optional chaining
- **Generic constraints**: Use proper generic constraints for reusable functions
- **Union types**: Prefer union types over loose typing for better type safety

### Documentation Standards
- **File headers**: Add comment at top of each file describing its purpose and responsibilities
- **Method documentation**: Document all public methods with JSDoc comments including:
  - Purpose and behavior
  - Parameter descriptions and types
  - Return value descriptions
  - Usage examples for complex functions
- **Code clarity**: Add inline comments explaining complex logic and business rules
- **Step-by-step documentation**: Break down multi-step processes with clear comments

### Naming Conventions
- **Files**: Use kebab-case for all filenames (`browser-tools.ts`, `chrome-provider.ts`)
- **Functions**: Use React-style naming and patterns for core functionality
- **Variables**: Use camelCase for variables and functions
- **Constants**: Use UPPER_SNAKE_CASE for constants
- **Interfaces**: Use PascalCase with descriptive names (`BrowserCapabilities`, `TabInfo`)

### Code Quality & Consistency
- **ESLint**: Run `npm run lint` after major changes to ensure code quality
- **Prettier**: Run `npm run format` to maintain consistent code formatting
- **Pre-commit checks**: Ensure repository passes all linting and formatting checks
- **Type checking**: Run `npm run type-check` to validate TypeScript compilation
- **Testing**: Run tests after implementing new features to ensure functionality

### React-Style Development Experience
```typescript
// Example: Core function with React-inspired API
const useBrowserTools = (browserType?: 'chrome' | 'safari' | 'auto'): BrowserTools => {
  // Implementation with clean, predictable interface
};

// Example: Method documentation
/**
 * Captures a screenshot of the specified browser tab
 * @param tabId - Unique identifier for the target tab
 * @param options - Screenshot capture options (quality, format, etc.)
 * @returns Promise resolving to base64 encoded image data
 * @throws BrowserConnectionError if tab is not accessible
 */
async captureScreenshot(tabId: string, options?: CaptureOptions): Promise<string>
```

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
- `setActiveTab(tabId)` - Switch to an existing tab (safer than navigation)
- `extractElements(tabId, selectors)` - Get element details
- `getCapabilities()` - Report what this browser supports

## Project Structure

```
mcp-browser-lens/
├── package.json                   # NPM package config, CLI binary
├── tsconfig.json                  # TypeScript configuration
├── DESIGN.md                      # This document
├── README.md                      # User documentation
├── captured/                      # Local testing outputs (screenshots, HTML, CSS)
│   ├── screenshots/               # PNG captures for inspection
│   ├── html/                      # Extracted HTML content
│   └── css/                       # Extracted CSS styles
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
**Responsibility**: Perfect Chrome DevTools Protocol integration for all 7 MCP tools

**Chrome Provider** (Primary and Only Target):
- Use Chrome DevTools Protocol (CDP) on port 9222
- Complete implementation of all 7 MCP tools:
  - `list_tabs` - Show available browser tabs
  - `capture_tab` - Complete screenshot + HTML + CSS extraction
  - `capture_screenshot` - High-quality tab screenshots
  - `capture_html` - DOM content extraction
  - `set_active_tab` - Safe tab switching (no arbitrary navigation)
  - `extract_elements` - Extract detailed element information from selectors
  - `get_browser_capabilities` - Chrome capability reporting
- Foundation for future browser expansion once Chrome is complete

**Future Browser Support** (Post-Chrome Completion):
- **Safari**: WebKit Remote Inspector Protocol (Phase 2)
- **Arc**: Chromium-based browser using Chrome provider (Phase 2)
- **Firefox/Zen**: Gecko-based browsers using Firefox Remote Debugging (Phase 3)
- **Cross-platform browsers**: After macOS Chrome perfection (Phase 4)

### 2. Capability Detection System
**Responsibility**: Detect Chrome availability and provide helpful setup guidance

Key considerations:
- Test Chrome DevTools Protocol connection on port 9222
- Provide clear setup instructions if Chrome not detected
- Handle Chrome updates that change protocol support
- Offer guidance for enabling Chrome debugging mode
- Foundation for multi-browser detection once Chrome is complete

### 3. MCP Server Integration
**Responsibility**: Expose browser tools through standardized MCP protocol

Core MCP Tools:
- `list_tabs` - Show available browser tabs
- `capture_tab` - Screenshot + HTML + CSS extraction
- `compare_tabs` - Side-by-side tab comparison
- `extract_design_elements` - CSS pattern analysis
- `set_active_tab` - Safe tab switching control

### 4. macOS-First Platform Support
**Responsibility**: Perfect Chrome integration on macOS, with foundation for future expansion

Platform priorities:
- **macOS (Phase 1)**: Chrome DevTools Protocol perfection
- **Chrome debugging setup**: Seamless Chrome launch with `--remote-debugging-port=9222`
- **Cross-platform foundation**: Abstract interfaces for future Windows/Linux support
- **Future platforms**: Windows and Linux Chrome support after macOS completion

## Critical Implementation Considerations

### Privacy & Security
- **Entirely local execution** - no data leaves user's machine
- **Explicit user consent** - clear documentation about browser access
- **Secure defaults** - don't auto-enable dangerous features
- **Process isolation** - avoid interfering with user's browsing

### Chrome Compatibility Strategy
- **Chrome DevTools Protocol mastery** - perfect CDP implementation
- **Clear setup guidance** - help users enable Chrome debugging
- **Version tolerance** - handle Chrome updates gracefully  
- **Protocol stability** - robust CDP connection handling
- **Foundation for future browsers** - extensible architecture

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

### Chrome Availability Issues
- **Chrome not installed**: Clear installation instructions with download links
- **Chrome running but debugging disabled**: Step-by-step setup guide for `--remote-debugging-port=9222`
- **Multiple Chrome instances**: Detect and choose the debugging-enabled instance
- **Chrome crashes during operation**: Robust reconnection and error recovery

### Network & Localhost Issues
- **Development server not running**: Helpful error messages
- **Port conflicts**: Scan multiple common ports
- **HTTPS/certificate issues**: Handle mixed content scenarios
- **Authentication required**: Document limitations and workarounds

### Platform-Specific Challenges
- **macOS Chrome integration** (Priority 1): Perfect Chrome DevTools Protocol on macOS
- **Chrome installation paths on macOS**: Handle App Store, Homebrew, and direct installations
- **Chrome debugging permissions**: Guide users through security settings
- **Future platform support**: Windows and Linux Chrome support in later phases

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

### Phase 1: Chrome Foundation & MCP Integration
1. Set up project structure and build system with `captured/` directory
2. Build MCP server with Chrome-focused tool definitions
3. Add to local `mcp.json` configuration for Cursor integration
4. Implement BrowserTools interface with Chrome provider focus

### Phase 2: Chrome DevTools Protocol Mastery
1. Perfect Chrome provider with all 7 MCP tools working flawlessly
2. Implement robust capability detection for Chrome debugging setup
3. Complete HTML, CSS, and screenshot extraction → validate in `captured/`
4. Add element extraction and safe tab switching
5. Perfect error handling and connection management for Chrome

### Phase 3: Chrome Feature Completion & Polish
1. Add advanced Chrome features (tab comparison, element extraction)
2. Implement comprehensive Chrome debugging guidance
3. Perfect Chrome performance and reliability
4. Complete documentation and troubleshooting for Chrome
5. Validate all 7 tools work perfectly with Chrome before expanding

### Phase 4: Multi-Browser Expansion (Post-Chrome)
1. Add Safari provider using WebKit Remote Inspector Protocol
2. Add Arc support via Chrome provider extension
3. Add Firefox/Zen providers using Gecko debugging protocols
4. Cross-platform support for Chrome on Windows/Linux
5. Community feedback integration and NPM publishing

### Local Development Workflow
- **MCP Integration First**: Add server to `mcp.json` immediately for testing
- **Captured Outputs**: Write all screenshots to `captured/screenshots/`, HTML to `captured/html/`, CSS to `captured/css/`
- **Chrome-First Testing**: Focus exclusively on Chrome DevTools Protocol
- **Iterative Validation**: Use Cursor/Claude to validate Chrome captures and refine all 7 tools
- **macOS Chrome Perfection**: Complete Chrome functionality before expanding to other browsers

## Success Metrics

- **Chrome DevTools Protocol Mastery**: Perfect implementation of all 7 MCP tools with Chrome
- **Chrome Setup Experience**: Zero-friction Chrome debugging setup guidance
- **Performance**: <2 second screenshot capture, <5 second HTML extraction with Chrome
- **Reliability**: Graceful handling of 90%+ Chrome edge cases and connection issues
- **Development Experience**: Seamless MCP integration and testing in Cursor with Chrome
- **Foundation for Future**: Extensible architecture ready for Safari, Arc, Firefox after Chrome completion

This design prioritizes Chrome DevTools Protocol mastery and complete 7-tool implementation before expanding to other browsers, ensuring a solid foundation for future multi-browser support.