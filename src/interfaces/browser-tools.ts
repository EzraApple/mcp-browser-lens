/**
 * Core BrowserTools interface that all browser providers must implement
 * Provides a consistent API across different browser types and platforms
 */

import {
  type TabInfo,
  type CaptureOptions,
  type HTMLCaptureOptions,
  type CSSCaptureOptions,
  type ElementInfo,
  type CaptureResult,
  type BrowserType,
} from "@/interfaces/types.js";
import { type BrowserCapabilities } from "@/interfaces/capabilities.js";

export interface BrowserTools {
  /**
   * Get the browser type this provider handles
   * @returns The browser type identifier
   */
  getBrowserType(): BrowserType;

  /**
   * Get the capabilities supported by this browser provider
   * @returns Browser capabilities object describing supported features
   */
  getCapabilities(): BrowserCapabilities;

  /**
   * Check if the browser is available and accessible
   * @returns Promise resolving to true if browser can be used
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize connection to the browser
   * @returns Promise that resolves when connection is established
   * @throws BrowserConnectionError if connection fails
   */
  connect(): Promise<void>;

  /**
   * Close connection to the browser
   * @returns Promise that resolves when connection is closed
   */
  disconnect(): Promise<void>;

  /**
   * List all open tabs in the browser
   * @returns Promise resolving to array of tab information
   * @throws BrowserConnectionError if browser is not accessible
   */
  listTabs(): Promise<TabInfo[]>;

  /**
   * Capture a screenshot of the specified browser tab
   * @param tabId - Unique identifier for the target tab
   * @param options - Screenshot capture options (quality, format, etc.)
   * @returns Promise resolving to base64 encoded image data
   * @throws TabNotFoundError if tab doesn't exist
   * @throws CaptureError if screenshot fails
   */
  captureScreenshot(tabId: string, options?: CaptureOptions): Promise<string>;

  /**
   * Extract HTML content from the specified browser tab
   * @param tabId - Unique identifier for the target tab
   * @param options - HTML extraction options
   * @returns Promise resolving to HTML content string
   * @throws TabNotFoundError if tab doesn't exist
   * @throws CaptureError if HTML extraction fails
   */
  captureHTML(tabId: string, options?: HTMLCaptureOptions): Promise<string>;

  /**
   * Extract CSS styles from the specified browser tab
   * @param tabId - Unique identifier for the target tab
   * @param options - CSS extraction options including selectors
   * @returns Promise resolving to CSS content string
   * @throws TabNotFoundError if tab doesn't exist
   * @throws CaptureError if CSS extraction fails
   */
  captureCSS(tabId: string, options: CSSCaptureOptions): Promise<string>;

  /**
   * Set a tab as active/focused in the browser
   * This is safer than navigation as it only switches between existing tabs
   * @param tabId - Unique identifier for the target tab
   * @returns Promise that resolves when tab is activated
   * @throws TabNotFoundError if tab doesn't exist
   * @throws BrowserConnectionError if activation fails
   */
  setActiveTab(tabId: string): Promise<void>;

  /**
   * Extract detailed information about specific elements
   * @param tabId - Unique identifier for the target tab
   * @param selectors - CSS selectors for elements to extract
   * @returns Promise resolving to array of element information
   * @throws TabNotFoundError if tab doesn't exist
   * @throws CaptureError if element extraction fails
   */
  extractElements(tabId: string, selectors: string[]): Promise<ElementInfo[]>;

  /**
   * Perform a complete capture of a tab (screenshot + HTML + CSS)
   * @param tabId - Unique identifier for the target tab
   * @param options - Combined capture options
   * @returns Promise resolving to complete capture result
   * @throws TabNotFoundError if tab doesn't exist
   * @throws CaptureError if any capture operation fails
   */
  captureTab(
    tabId: string,
    options?: {
      screenshot?: CaptureOptions;
      html?: HTMLCaptureOptions;
      css?: CSSCaptureOptions;
    },
  ): Promise<CaptureResult>;


}

/**
 * Factory function type for creating browser tools instances
 */
export type BrowserToolsFactory = (
  browserType?: BrowserType,
) => Promise<BrowserTools>;

/**
 * Configuration options for browser tools
 */
export interface BrowserToolsConfig {
  /** Preferred browser type */
  preferredBrowser?: BrowserType;
  /** Timeout for operations in milliseconds */
  timeout?: number;
  /** Directory to save captured outputs */
  captureDirectory?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom browser executable paths */
  customPaths?: Partial<Record<BrowserType, string>>;
  /** Custom debug ports */
  customPorts?: Partial<Record<BrowserType, number>>;
}
