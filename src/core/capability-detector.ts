/**
 * Chrome capability detection and setup guidance
 * Detects Chrome with DevTools Protocol enabled and provides setup help
 */

import { type BrowserType, type BrowserDetectionResult } from "@/interfaces/types.js";
import {
  type CapabilityScore,
  type PlatformCapabilities,
} from "@/interfaces/capabilities.js";
import { browserLog } from "@/utils/logger.js";

/**
 * Detect Chrome with DevTools Protocol enabled
 * @returns Promise resolving to Chrome detection result, or null if not available
 */
export async function detectBestBrowser(): Promise<BrowserDetectionResult | null> {
  browserLog.debug("Detecting Chrome with debugging enabled...");

  const chromeResult = await detectSingleBrowser("chrome");

  if (chromeResult) {
    browserLog.success(
      `Chrome detected: ${chromeResult.name} v${chromeResult.version}`,
    );
    return chromeResult;
  }

  browserLog.error("Chrome not detected or debugging not enabled");
  return null;
}

/**
 * Detect Chrome availability for MCP operations
 * @returns Promise resolving to Chrome detection result in array format (for compatibility)
 */
export async function detectAllBrowsers(): Promise<BrowserDetectionResult[]> {
  browserLog.debug("Checking for Chrome with debugging enabled...");

  try {
    const chromeResult = await detectSingleBrowser("chrome");
    if (chromeResult) {
      browserLog.success("Chrome detected and ready");
      return [chromeResult];
    } else {
      browserLog.debug("Chrome not available");
      return [];
    }
  } catch (error) {
    browserLog.error(
      `Failed to detect Chrome: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Detect Chrome availability and debugging status
 * @param browserType - Must be 'chrome' (other browsers not currently supported)
 * @returns Promise resolving to Chrome detection result or null if not available
 */
async function detectSingleBrowser(
  browserType: BrowserType,
): Promise<BrowserDetectionResult | null> {
  // Only support Chrome for now
  if (browserType !== "chrome") {
    browserLog.debug(
      `${browserType} not supported in Chrome-first development phase`,
    );
    return null;
  }

  const debugPort = 9222; // Chrome DevTools Protocol standard port
  const url = `http://localhost:${debugPort}/json/version`;

  browserLog.debug(`Testing Chrome DevTools Protocol on port ${debugPort}...`);

  try {
    // Check if Chrome is running with debug port open
    browserLog.debug(`Fetching: ${url}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    browserLog.debug(`Chrome response status: ${response.status}`);

    if (response.ok) {
      const versionInfo = (await response.json()) as Record<string, any>;
      browserLog.debug("Chrome version info:", versionInfo);

      const result = {
        type: "chrome" as BrowserType,
        name: "Google Chrome",
        version: versionInfo?.Browser?.split("/")?.[1] || "Unknown",
        executablePath: undefined,
        isRunning: true,
        debugPort: debugPort,
      };

      browserLog.success("Chrome detected successfully:", result);
      return result;
    } else {
      browserLog.debug(
        `Chrome DevTools Protocol not available: HTTP ${response.status}`,
      );
    }
  } catch (error) {
    browserLog.debug(
      `Chrome detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return null;
}

/**
 * Generate Chrome capability score for current setup
 * @returns Promise resolving to Chrome capability score
 */
export async function getChromeCapabilityScore(): Promise<CapabilityScore> {
  const chromeResult = await detectSingleBrowser("chrome");

  if (!chromeResult) {
    return {
      score: 0,
      features: {
        tabManagement: 0,
        screenshotCapture: 0,
        contentExtraction: 0,
        navigation: 0,
        performance: 0,
      },
      reasoning: [
        "Chrome not detected",
        "Please start Chrome with: chrome --remote-debugging-port=9222",
        'Or on macOS: open -a "Google Chrome" --args --remote-debugging-port=9222',
      ],
    };
  }

  return await scoreBrowserCapabilities(chromeResult);
}

/**
 * Score Chrome's capabilities for MCP operations
 * @param browser - Chrome detection result to score
 * @returns Promise resolving to capability score
 */
async function scoreBrowserCapabilities(
  browser: BrowserDetectionResult,
): Promise<CapabilityScore> {
  // Chrome should have excellent capabilities when properly configured
  const features = {
    tabManagement: 95,
    screenshotCapture: 95,
    contentExtraction: 95,
    navigation: 95,
    performance: 90,
  };

  const reasoning = [
    "Chrome DevTools Protocol detected",
    `Chrome v${browser.version} running with debugging enabled`,
    `All 7 MCP tools available via port ${browser.debugPort}`,
  ];

  return {
    score: 95, // Chrome gets high score when available
    features,
    reasoning,
  };
}

/**
 * Get Chrome setup instructions for users
 * @returns Helpful setup instructions for enabling Chrome debugging
 */
export function getChromeSetupInstructions(): string {
  const platform = process.platform;

  switch (platform) {
    case "darwin": // macOS
      return `To enable Chrome debugging on macOS:
1. Quit Chrome completely
2. Open Terminal and run:
   open -a "Google Chrome" --args --remote-debugging-port=9222
3. Or from command line:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 &

Chrome will now be accessible for MCP operations.`;

    case "win32": // Windows
      return `To enable Chrome debugging on Windows:
1. Close Chrome completely
2. Right-click Chrome shortcut → Properties
3. Add to Target field: --remote-debugging-port=9222
4. Or run from Command Prompt:
   chrome.exe --remote-debugging-port=9222

Chrome will now be accessible for MCP operations.`;

    default: // Linux and others
      return `To enable Chrome debugging:
1. Close Chrome completely
2. Run from terminal:
   google-chrome --remote-debugging-port=9222 &
   
Or add --remote-debugging-port=9222 to your Chrome startup script.`;
  }
}

/**
 * Get Chrome debugging port
 * @returns Chrome DevTools Protocol port (always 9222)
 */
function getChromeDebugPort(): number {
  return 9222; // Chrome DevTools Protocol standard port
}

/**
 * Get Chrome display name
 * @returns Human-readable Chrome name
 */
function getChromeDisplayName(): string {
  return "Google Chrome";
}

/**
 * Get Chrome-specific platform capabilities for the current system
 * @returns Platform capabilities object focused on Chrome support
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = process.platform;

  const baseChromeConfig = {
    defaultPort: 9222,
    debugLaunchArgs: ["--remote-debugging-port=9222"],
  };

  switch (platform) {
    case "darwin": // macOS
      return {
        platform: "macos",
        supportedBrowsers: ["chrome"],
        features: {
          hasAppleScript: true,
          hasNativeScreenCapture: true,
        },
        browserConfigs: {
          chrome: {
            ...baseChromeConfig,
            installPaths: [
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/usr/local/bin/google-chrome",
            ],
            processNames: ["Google Chrome", "chrome"],
          },
          // Placeholder configs for future browser support
          safari: { installPaths: [], processNames: [] },
          firefox: { installPaths: [], processNames: [] },
          arc: { installPaths: [], processNames: [] },
          zen: { installPaths: [], processNames: [] },
          auto: { installPaths: [], processNames: [] },
        },
      };

    case "win32": // Windows
      return {
        platform: "windows",
        supportedBrowsers: ["chrome"],
        features: {
          hasNativeScreenCapture: false,
        },
        browserConfigs: {
          chrome: {
            ...baseChromeConfig,
            installPaths: [
              "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
              "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            ],
            processNames: ["chrome.exe", "Google Chrome"],
          },
          // Placeholder configs for future browser support
          safari: { installPaths: [], processNames: [] },
          firefox: { installPaths: [], processNames: [] },
          arc: { installPaths: [], processNames: [] },
          zen: { installPaths: [], processNames: [] },
          auto: { installPaths: [], processNames: [] },
        },
      };

    default: // Linux and others
      return {
        platform: "linux",
        supportedBrowsers: ["chrome"],
        features: {
          hasNativeScreenCapture: false,
        },
        browserConfigs: {
          chrome: {
            ...baseChromeConfig,
            installPaths: [
              "/usr/bin/google-chrome",
              "/usr/bin/google-chrome-stable",
              "/usr/bin/chromium-browser",
            ],
            processNames: ["chrome", "google-chrome", "chromium-browser"],
          },
          // Placeholder configs for future browser support
          safari: { installPaths: [], processNames: [] },
          firefox: { installPaths: [], processNames: [] },
          arc: { installPaths: [], processNames: [] },
          zen: { installPaths: [], processNames: [] },
          auto: { installPaths: [], processNames: [] },
        },
      };
  }
}
