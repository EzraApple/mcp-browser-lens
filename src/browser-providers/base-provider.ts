/**
 * Abstract base class for all browser providers
 * Defines the common interface and shared functionality
 */

import {
  type BrowserTools,
  type BrowserToolsConfig,
} from "@/interfaces/browser-tools.js";
import {
  type TabInfo,
  type CaptureOptions,
  type HTMLCaptureOptions,
  type CSSCaptureOptions,
  type ElementInfo,
  type CaptureResult,
  type BrowserType,
  BrowserConnectionError,
  TabNotFoundError,
  CaptureError,
} from "@/interfaces/types.js";
import { type BrowserCapabilities } from "@/interfaces/capabilities.js";

export abstract class BaseBrowserProvider implements BrowserTools {
  protected connected: boolean = false;
  protected config: BrowserToolsConfig;

  constructor(config: BrowserToolsConfig = {}) {
    this.config = {
      timeout: 30000,
      captureDirectory: "captured",
      debug: false,
      ...config,
    };
  }

  // Abstract methods that must be implemented by subclasses
  abstract getBrowserType(): BrowserType;
  abstract getCapabilities(): BrowserCapabilities;
  abstract isAvailable(): Promise<boolean>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract listTabs(): Promise<TabInfo[]>;
  abstract captureScreenshot(
    tabId: string,
    options?: CaptureOptions,
  ): Promise<string>;
  abstract captureHTML(
    tabId: string,
    options?: HTMLCaptureOptions,
  ): Promise<string>;
  abstract captureCSS(
    tabId: string,
    options: CSSCaptureOptions,
  ): Promise<string>;
  abstract setActiveTab(tabId: string): Promise<void>;
  abstract extractElements(
    tabId: string,
    selectors: string[],
  ): Promise<ElementInfo[]>;

  // Common implementations that can be overridden by subclasses

  /**
   * Perform a complete capture of a tab (screenshot + HTML + CSS)
   * Default implementation that calls individual capture methods
   */
  async captureTab(
    tabId: string,
    options?: {
      screenshot?: CaptureOptions;
      html?: HTMLCaptureOptions;
      css?: CSSCaptureOptions;
    },
  ): Promise<CaptureResult> {
    if (!this.connected) {
      throw new BrowserConnectionError(
        "Browser not connected. Call connect() first.",
        this.getBrowserType(),
      );
    }

    // Get tab info first
    const tabs = await this.listTabs();
    const tabInfo = tabs.find((tab) => tab.id === tabId);
    if (!tabInfo) {
      throw new TabNotFoundError(`Tab with ID ${tabId} not found`, tabId);
    }

    const result: CaptureResult = {
      timestamp: Date.now(),
      tabInfo,
    };

    try {
      // Capture screenshot if requested
      if (options?.screenshot) {
        result.screenshot = await this.captureScreenshot(
          tabId,
          options.screenshot,
        );
      }

      // Capture HTML if requested
      if (options?.html) {
        result.html = await this.captureHTML(tabId, options.html);
      }

      // Capture CSS if requested
      if (options?.css) {
        result.css = await this.captureCSS(tabId, options.css);
      }

      return result;
    } catch (error) {
      throw new CaptureError(
        `Failed to capture tab ${tabId}: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
        "complete",
      );
    }
  }



  /**
   * Helper method to validate that browser is connected
   */
  protected assertConnected(): void {
    if (!this.connected) {
      throw new BrowserConnectionError(
        "Browser not connected. Call connect() first.",
        this.getBrowserType(),
      );
    }
  }

  /**
   * Helper method to find a tab by ID
   */
  protected async findTabById(tabId: string): Promise<TabInfo> {
    const tabs = await this.listTabs();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) {
      throw new TabNotFoundError(`Tab with ID ${tabId} not found`, tabId);
    }
    return tab;
  }

  /**
   * Helper method to log debug messages
   */
  protected debug(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.error(
        `[${this.getBrowserType().toUpperCase()}] ${message}`,
        ...args,
      );
    }
  }

  /**
   * Helper method to create timeout promises
   */
  protected createTimeout<T>(
    promise: Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    const timeout = timeoutMs || this.config.timeout || 30000;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  /**
   * Helper method to validate URLs
   */
  protected validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper method to sanitize CSS selectors
   */
  protected sanitizeSelectors(selectors: string[]): string[] {
    return selectors.filter((selector) => {
      // Basic validation - ensure selector doesn't contain dangerous characters
      return /^[a-zA-Z0-9\s\-_#.\[\]:(),>+~*="']+$/.test(selector);
    });
  }
}
