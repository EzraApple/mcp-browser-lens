/**
 * Chrome Auto-Launch Utility
 * Handles Chrome browser detection, launching, and welcome page setup for MCP Browser Lens
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { serverLog } from "@/utils/logger.js";

const execAsync = promisify(exec);

export interface ChromeLaunchResult {
  wasRunning: boolean;
  launched: boolean;
  debugPort: number;
  welcomePageOpened: boolean;
  error?: string;
}

export class ChromeLauncher {
  private readonly debugPort: number = 9222;
  private readonly welcomePagePath: string;

  constructor() {
    // Path to our welcome HTML file
    this.welcomePagePath = path.join(process.cwd(), "src", "templates", "welcome.html");
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
   * Get Chrome executable path for macOS
   * @returns Promise<string> Path to Chrome executable
   */
  private async getChromeExecutablePath(): Promise<string> {
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chrome.app/Contents/MacOS/Chrome",
      "/usr/local/bin/google-chrome",
      "/opt/homebrew/bin/google-chrome",
    ];

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

    throw new Error("Chrome executable not found. Please install Google Chrome.");
  }

  /**
   * Get the welcome page URL (as file:// URL)
   * @returns string File URL to welcome page
   */
  private getWelcomePageUrl(): string {
    const absolutePath = path.resolve(this.welcomePagePath);
    return `file://${absolutePath}`;
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
          serverLog.error("Failed to open welcome page in existing Chrome:", error);
        }
        
        return result;
      }

      // Get Chrome executable path
      const chromePath = await this.getChromeExecutablePath();
      const welcomeUrl = this.getWelcomePageUrl();

      // Chrome launch arguments
      const chromeArgs = [
        `--remote-debugging-port=${this.debugPort}`,
        "--disable-web-security", // For local file access
        "--disable-features=VizDisplayCompositor",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-background-mode",
        "--no-first-run",
        "--no-default-browser-check",
        welcomeUrl, // Open welcome page directly
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
          result.welcomePageOpened = true;
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