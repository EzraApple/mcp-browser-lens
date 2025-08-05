/**
 * Browser factory implementation for useBrowserTools() function
 * Provides React-style API for creating browser tools instances
 */

import {
  type BrowserTools,
  type BrowserToolsConfig,
} from "@/interfaces/browser-tools.js";
import { type BrowserType } from "@/interfaces/types.js";
import { ChromeProvider } from "@/browser-providers/chrome-provider.js";
import { detectBestBrowser } from "@/core/capability-detector.js";
import { factoryLog } from "@/utils/logger.js";

/**
 * React-style hook for creating browser tools instances
 * @param browserType - Specific browser type or 'auto' for auto-detection
 * @param config - Configuration options for browser tools
 * @returns Promise resolving to configured BrowserTools instance
 */
export async function useBrowserTools(
  browserType: BrowserType = "auto",
  config: BrowserToolsConfig = {},
): Promise<BrowserTools> {
  factoryLog.debug(`Creating browser tools for: ${browserType}`);

  let targetBrowser = browserType;

  // Auto-detect best available browser if needed
  if (browserType === "auto") {
    factoryLog.debug("Auto-detecting best available browser...");
    const detection = await detectBestBrowser();
    if (!detection) {
      const errorMsg =
        "Chrome not found with debugging enabled. Chrome will be auto-launched:\n" +
        "\nManual launch: chrome --remote-debugging-port=9222\n" +
        'macOS manual: open -a "Google Chrome" --args --remote-debugging-port=9222';
      factoryLog.error(errorMsg);
      throw new Error(errorMsg);
    }
    targetBrowser = detection.type;
    factoryLog.success(`Detected browser: ${targetBrowser}`);
  }

  // Create the appropriate provider
  factoryLog.debug(`Creating ${targetBrowser} provider...`);
  const provider = createBrowserProvider(targetBrowser, config);

  // Test availability and connect
  factoryLog.debug(`Testing ${targetBrowser} availability...`);
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    const errorMsg = `${targetBrowser} is not available. Please ensure the browser is running with debugging enabled.`;
    factoryLog.error(errorMsg);
    throw new Error(errorMsg);
  }

  factoryLog.success(`${targetBrowser} is available, connecting...`);
  await provider.connect();
  factoryLog.success(
    `Successfully created and connected ${targetBrowser} provider`,
  );

  return provider;
}

/**
 * Factory function to create browser provider instances
 * Supports Chrome and Safari (on macOS)
 * @param browserType - The browser type to create a provider for
 * @param config - Configuration options
 * @returns BrowserTools instance for the specified browser
 */
function createBrowserProvider(
  browserType: BrowserType,
  config: BrowserToolsConfig,
): BrowserTools {
  switch (browserType) {
    case "chrome":
      // Chrome provider using DevTools Protocol
      return new ChromeProvider(config);

    default:
      throw new Error(
        `Browser type "${browserType}" is not currently supported.\n` +
          `Currently supported: Chrome with auto-launch and debugging\n` +
          `Future browsers (Safari, Firefox, Arc) can be added as needed.`,
      );
  }
}

/**
 * Get a list of currently supported browser types
 * Chrome-first with clear extension points for future browsers
 * @returns Array of supported browser type strings
 */
export function getSupportedBrowserTypes(): BrowserType[] {
  // Currently Chrome-focused for best debugging experience
  // Future: Add conditional support for other browsers as needed
  return ["chrome"];
}

/**
 * Check if a browser type is supported
 * @param browserType - Browser type to check
 * @returns True if the browser type is supported
 */
export function isBrowserTypeSupported(browserType: BrowserType): boolean {
  return getSupportedBrowserTypes().includes(browserType);
}

/**
 * Create browser tools with explicit error handling and connection management
 * @param browserType - Browser type to create
 * @param config - Configuration options
 * @returns Promise resolving to connected BrowserTools instance
 */
export async function createConnectedBrowserTools(
  browserType: BrowserType,
  config: BrowserToolsConfig = {},
): Promise<BrowserTools> {
  const provider = createBrowserProvider(browserType, config);

  try {
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `${browserType} is not available or not properly configured`,
      );
    }

    await provider.connect();
    return provider;
  } catch (error) {
    // Ensure we clean up if connection fails
    try {
      await provider.disconnect();
    } catch {
      // Ignore disconnect errors during cleanup
    }
    throw error;
  }
}

/**
 * Utility function to test browser availability without connecting
 * @param browserType - Browser type to test
 * @returns Promise resolving to availability status
 */
export async function testBrowserAvailability(
  browserType: BrowserType,
): Promise<boolean> {
  try {
    const provider = createBrowserProvider(browserType, { debug: false });
    return await provider.isAvailable();
  } catch {
    return false;
  }
}
