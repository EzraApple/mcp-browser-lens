/**
 * Chrome Auto-Launch Utility
 * Handles Chrome browser detection, launching, and welcome page setup for MCP Browser Lens
 * Uses embedded HTML for better distribution compatibility
 */

import { spawn } from "child_process";
import fs from "fs";
import { serverLog } from "@/utils/logger.js";

export interface ChromeLaunchResult {
  wasRunning: boolean;
  launched: boolean;
  debugPort: number;
  welcomePageOpened: boolean;
  error?: string;
}

export class ChromeLauncher {
  private readonly debugPort: number = 9222;
  
  // Embedded welcome HTML for distribution compatibility - Clean developer docs style
  private readonly welcomeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Browser Lens - Ready</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            color: #374151;
            background: #ffffff;
            min-height: 100vh;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 48px;
            padding-bottom: 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 1.1rem;
            color: #6b7280;
        }
        
        .status {
            background: #f0fdf4;
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
            text-align: center;
        }
        
        .status h2 {
            color: #065f46;
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .status p {
            color: #047857;
            font-size: 0.9rem;
        }
        
        .capabilities {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .capability {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            transition: border-color 0.2s;
        }
        
        .capability:hover {
            border-color: #d1d5db;
        }
        
        .capability-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .capability-icon {
            width: 20px;
            height: 20px;
            color: #6b7280;
        }
        
        .capability h3 {
            color: #111827;
            font-size: 1rem;
            font-weight: 500;
        }
        
        .capability p {
            color: #6b7280;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .examples {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .examples h3 {
            color: #111827;
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 16px;
        }
        
        .command {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.85rem;
            color: #374151;
        }
        
        .command:last-child {
            margin-bottom: 0;
        }
        
        .note {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 16px;
            color: #92400e;
            font-size: 0.9rem;
        }
        
        /* Simple icons using SVG paths */
        .icon-list { d: path('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'); }
        .icon-camera { d: path('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z'); }
        .icon-code { d: path('m18 16 4-4-4-4M6 8l-4 4 4 4'); }
        .icon-target { d: path('M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 1 0 0-12z M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z'); }
        .icon-scroll { d: path('M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 1 4 0v3h12V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z'); }
        .icon-tabs { d: path('M3 3v5h6V3H3zM15 3v5h6V3h-6zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3z'); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MCP Browser Lens</h1>
            <p>AI browser automation ready</p>
        </div>
        
        <div class="status">
            <h2>✓ Chrome debugging enabled</h2>
            <p>Your AI assistant can now interact with this browser</p>
        </div>
        
        <div class="capabilities">
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path>
                    </svg>
                    <h3>List Tabs</h3>
                </div>
                <p>View and switch between all open browser tabs</p>
            </div>
            
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <h3>Screenshots</h3>
                </div>
                <p>Capture full page or viewport screenshots</p>
            </div>
            
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                    </svg>
                    <h3>Extract Content</h3>
                </div>
                <p>Get HTML, CSS, and page structure data</p>
            </div>
            
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <h3>Element Inspection</h3>
                </div>
                <p>Find and analyze elements with CSS selectors</p>
            </div>
            
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                    </svg>
                    <h3>Page Scrolling</h3>
                </div>
                <p>Navigate through pages with various scroll methods</p>
            </div>
            
            <div class="capability">
                <div class="capability-header">
                    <svg class="capability-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                    </svg>
                    <h3>Tab Management</h3>
                </div>
                <p>Switch and manage browser tabs safely</p>
            </div>
        </div>
        
        <div class="examples">
            <h3>Example Commands</h3>
            <div class="command">Take a screenshot of this page</div>
            <div class="command">List all my open tabs</div>
            <div class="command">Extract the navigation menu from this site</div>
            <div class="command">Scroll to the footer and screenshot it</div>
        </div>
        
        <div class="note">
            <strong>Note:</strong> Keep this tab open to maintain the debugging connection. You can now browse to any website and ask your AI assistant to interact with it.
        </div>
    </div>
</body>
</html>`;

  constructor() {
    // No file paths needed - using embedded HTML
  }

  /**
   * Check if Chrome is currently running with debugging enabled
   * @returns Promise<boolean> True if Chrome debugging is available
   */
  async isChromeRunningWithDebugging(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.debugPort}/json/version`, {
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json() as { Browser?: string };
        serverLog.debug(`Chrome detected: ${data.Browser || 'Unknown'}`);
        return true;
      }
      return false;
    } catch (error) {
      serverLog.debug("Chrome debugging not detected:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get Chrome executable path for current platform
   * @returns Promise<string> Path to Chrome executable
   */
  private async getChromeExecutablePath(): Promise<string> {
    const platform = process.platform;
    let possiblePaths: string[] = [];

    switch (platform) {
      case "darwin": // macOS
        possiblePaths = [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chrome.app/Contents/MacOS/Chrome",
          "/usr/local/bin/google-chrome",
          "/opt/homebrew/bin/google-chrome",
        ];
        break;
      
      case "win32": // Windows
        possiblePaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ];
        break;
      
      default: // Linux and others
        possiblePaths = [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium-browser",
        ];
        break;
    }

    for (const chromePath of possiblePaths) {
      try {
        if (fs.existsSync(chromePath)) {
          serverLog.debug(`Found Chrome at: ${chromePath}`);
          return chromePath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(`Chrome executable not found for ${platform}. Please install Google Chrome.`);
  }

  /**
   * Get platform-appropriate clean profile path for Chrome debugging
   * @returns string Path to temporary profile directory
   */
  private getCleanProfilePath(): string {
    const platform = process.platform;
    
    switch (platform) {
      case "win32": // Windows
        return `${process.env.TEMP || 'C:\\tmp'}\\chrome-debug-profile`;
      
      case "darwin": // macOS
      default: // Linux and others
        return "/tmp/chrome-debug-profile";
    }
  }

  /**
   * Get the welcome page URL as a data URI
   * @returns string Data URI containing the embedded HTML
   */
  private getWelcomePageUrl(): string {
    // Convert HTML to base64 data URI for Chrome
    const encoded = Buffer.from(this.welcomeHTML, 'utf8').toString('base64');
    return `data:text/html;base64,${encoded}`;
  }

  /**
   * Launch Chrome with debugging enabled and welcome page
   * @returns Promise<ChromeLaunchResult> Result of launch attempt
   */
  async launchChromeWithDebugging(): Promise<ChromeLaunchResult> {
    const result: ChromeLaunchResult = {
      wasRunning: false,
      launched: false,
      debugPort: this.debugPort,
      welcomePageOpened: false,
    };

    try {
      // First, check if Chrome is already running with debugging
      result.wasRunning = await this.isChromeRunningWithDebugging();
      
      if (result.wasRunning) {
        serverLog.success("Chrome already running with debugging enabled");
        
        // Try to open welcome page in existing Chrome instance
        try {
          await this.openWelcomePageInRunningChrome();
          result.welcomePageOpened = true;
          serverLog.success("Opened welcome page in existing Chrome instance");
        } catch (error) {
          serverLog.debug("Failed to open welcome page in existing Chrome:", error);
        }
        
        return result;
      }

      // Get Chrome executable path
      const chromePath = await this.getChromeExecutablePath();
      const welcomeUrl = this.getWelcomePageUrl();

      // Chrome launch arguments
      const chromeArgs = [
        `--remote-debugging-port=${this.debugPort}`,
        "--disable-features=VizDisplayCompositor",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-background-mode",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${this.getCleanProfilePath()}`, // Use clean profile for debugging
        welcomeUrl, // Open clean welcome page directly (now a data URI)
      ];

      serverLog.debug(`Launching Chrome with args: ${chromeArgs.join(" ")}`);

      // Launch Chrome as detached process
      const chromeProcess = spawn(chromePath, chromeArgs, {
        detached: true,
        stdio: "ignore",
      });

      // Detach the process so it continues running after our script ends
      chromeProcess.unref();

      serverLog.debug(`Chrome process launched with PID: ${chromeProcess.pid}`);

      // Wait for Chrome to start and debugging to become available
      const maxWaitTime = 10000; // 10 seconds
      const checkInterval = 500; // Check every 500ms
      let waited = 0;

      while (waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;

        if (await this.isChromeRunningWithDebugging()) {
          result.launched = true;
          result.welcomePageOpened = true; // Welcome page opened with Chrome
          serverLog.success(`Chrome launched successfully with debugging on port ${this.debugPort}`);
          serverLog.success("Welcome page opened automatically");
          return result;
        }
      }

      throw new Error(`Chrome failed to start with debugging within ${maxWaitTime}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      serverLog.error("Failed to launch Chrome:", errorMessage);
      return result;
    }
  }

  /**
   * Open welcome page in already running Chrome instance
   * @returns Promise<void>
   */
  private async openWelcomePageInRunningChrome(): Promise<void> {
    try {
      const welcomeUrl = this.getWelcomePageUrl();
      
      // Create a new tab with welcome page
      const response = await fetch(`http://localhost:${this.debugPort}/json/new?${encodeURIComponent(welcomeUrl)}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to create new tab: ${response.status} ${response.statusText}`);
      }

      const tabInfo = await response.json();
      serverLog.debug("Created welcome tab:", tabInfo);
      
    } catch (error) {
      throw new Error(`Failed to open welcome page: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure Chrome is available for MCP operations
   * This is the main entry point for server startup
   * @returns Promise<ChromeLaunchResult>
   */
  async ensureChromeDebugging(): Promise<ChromeLaunchResult> {
    serverLog.debug("Ensuring Chrome debugging availability...");
    
    const result = await this.launchChromeWithDebugging();
    
    if (result.launched || result.wasRunning) {
      serverLog.success("Chrome debugging ready for MCP operations");
    } else {
      serverLog.error("Failed to establish Chrome debugging connection", result.error);
    }
    
    return result;
  }
}

// Export singleton instance
export const chromeLauncher = new ChromeLauncher();