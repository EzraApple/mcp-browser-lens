/**
 * Chrome browser provider implementation
 * Uses Chrome DevTools Protocol for browser automation
 */

 
import CDP from "chrome-remote-interface";
import { BaseBrowserProvider } from "@/browser-providers/base-provider.js";
import {
  type TabInfo,
  type CaptureOptions,
  type HTMLCaptureOptions,
  type CSSCaptureOptions,
  type ElementInfo,
  type BrowserType,
  BrowserConnectionError,
  TabNotFoundError,
  CaptureError,
} from "@/interfaces/types.js";
import {
  type BrowserCapabilities,
  TIER_1_CAPABILITIES,
} from "@/interfaces/capabilities.js";
import { type BrowserToolsConfig } from "@/interfaces/browser-tools.js";
import { chromeLog } from "@/utils/logger.js";

export class ChromeProvider extends BaseBrowserProvider {
  private cdpClient: any = null; // Chrome DevTools Protocol client
  private readonly debugPort: number;
  private enabledDomains: Set<string> = new Set();

  constructor(config: BrowserToolsConfig = {}) {
    super(config);
    this.debugPort = config.customPorts?.chrome || 9222;
  }

  getBrowserType(): BrowserType {
    return "chrome";
  }

  getCapabilities(): BrowserCapabilities {
    return { ...TIER_1_CAPABILITIES };
  }

  async isAvailable(): Promise<boolean> {
    const url = `http://localhost:${this.debugPort}/json/version`;
    chromeLog.debug(`Checking availability at ${url}...`);

    try {
      // Check if Chrome is running with debug port open
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3000),
      });

      chromeLog.debug(
        `Availability check response: ${response.status} ${response.statusText}`,
      );

      if (response.ok) {
        const data = await response.json();
        chromeLog.success("Chrome is available:", data);
        return true;
      } else {
        chromeLog.debug(`Chrome not available: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      chromeLog.debug(
        `Chrome availability check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      chromeLog.debug("Already connected, skipping connection");
      return;
    }

    chromeLog.debug(
      `Attempting to connect to Chrome DevTools Protocol on port ${this.debugPort}...`,
    );

    try {
      // Check availability first
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        const errorMsg = `Chrome not available on debug port ${this.debugPort}. Please start Chrome with --remote-debugging-port=9222`;
        chromeLog.error(`Connection failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Create CDP connection to the first available tab
      chromeLog.debug("Establishing CDP WebSocket connection...");
      this.cdpClient = await CDP({ port: this.debugPort });

      chromeLog.debug("CDP client connected, enabling required domains...");

      // Enable essential domains for browser operations
      await this.enableDomain("Page");
      await this.enableDomain("Runtime");
      await this.enableDomain("DOM");

      this.connected = true;
      chromeLog.success("Connected to Chrome DevTools Protocol successfully");
    } catch (error) {
      const errorMsg = `Failed to connect to Chrome: ${error instanceof Error ? error.message : String(error)}`;
      chromeLog.error(errorMsg);
      throw new BrowserConnectionError(
        errorMsg,
        "chrome",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Enable a CDP domain if not already enabled
   * @param domain - Domain name (e.g., 'Page', 'Runtime', 'DOM')
   */
  private async enableDomain(domain: string): Promise<void> {
    if (this.enabledDomains.has(domain)) {
      return;
    }

    chromeLog.debug(`Enabling ${domain} domain...`);
    await this.cdpClient[domain].enable();
    this.enabledDomains.add(domain);
    chromeLog.debug(`${domain} domain enabled`);
  }

  /**
   * Connect to a specific tab for CDP operations
   * @param tabId - Tab ID to connect to
   * @returns CDP client connected to the specific tab
   */
  private async connectToTab(tabId: string): Promise<any> {
    try {
      chromeLog.debug(`Connecting to tab ${tabId} for CDP operations...`);
      const tabClient = await CDP({ port: this.debugPort, tab: tabId });

      // Enable essential domains for this tab
      await tabClient.Page.enable();
      await tabClient.Runtime.enable();
      await tabClient.DOM.enable();

      chromeLog.debug(`Connected to tab ${tabId} successfully`);
      return tabClient;
    } catch (error) {
      throw new TabNotFoundError(
        `Failed to connect to tab ${tabId}: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.cdpClient) {
        chromeLog.debug("Closing CDP connection...");
        await this.cdpClient.close();
        this.cdpClient = null;
      }
      this.enabledDomains.clear();
      this.connected = false;
      chromeLog.success("Disconnected from Chrome DevTools Protocol");
    } catch (error) {
      chromeLog.error("Error during disconnect:", error);
    }
  }

  async listTabs(): Promise<TabInfo[]> {
    this.assertConnected();

    try {
      chromeLog.debug("Fetching tab list from Chrome...");

      const url = `http://localhost:${this.debugPort}/json/list`;
      chromeLog.debug(`Fetching tabs from: ${url}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      chromeLog.debug(
        `Tabs response: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tabs = (await response.json()) as any[];
      chromeLog.debug("Raw tabs data:", tabs);

      const pageTabs = tabs.filter((tab: any) => tab.type === "page");
      chromeLog.debug(
        `Filtered ${pageTabs.length} page tabs from ${tabs.length} total tabs`,
      );

      const result = pageTabs.map((tab: any, index: number) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: index === 0, // First tab is considered active for simplicity
        favIconUrl: tab.faviconUrl,
        browserType: "chrome" as BrowserType,
        windowId: tab.windowId,
      }));

      chromeLog.success(`Successfully mapped ${result.length} tabs:`, result);
      return result;
    } catch (error) {
      const errorMsg = `Failed to list Chrome tabs: ${error instanceof Error ? error.message : String(error)}`;
      chromeLog.error(errorMsg);
      throw new BrowserConnectionError(
        errorMsg,
        "chrome",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async captureScreenshot(
    tabId: string,
    options: CaptureOptions = {},
  ): Promise<string> {
    this.assertConnected();
    await this.findTabById(tabId); // Validate tab exists

    let tabClient: any = null;
    try {
      chromeLog.debug(
        `Capturing screenshot of tab ${tabId} with options:`,
        options,
      );

      // Connect to the specific tab
      tabClient = await this.connectToTab(tabId);

      // Prepare screenshot parameters
      const screenshotParams: any = {
        format: options.format || "png",
        quality:
          options.quality || (options.format === "jpeg" ? 80 : undefined),
        captureBeyondViewport: options.fullPage || false,
      };

      // Add clip if specified
      if (options.clip) {
        screenshotParams.clip = {
          x: options.clip.x,
          y: options.clip.y,
          width: options.clip.width,
          height: options.clip.height,
          scale: options.devicePixelRatio || 1,
        };
      }

      chromeLog.debug(`Taking screenshot with params:`, screenshotParams);

      // Capture screenshot using CDP
      const result = await tabClient.Page.captureScreenshot(screenshotParams);

      chromeLog.success(
        `Screenshot captured for tab ${tabId}, data length: ${result.data.length}`,
      );
      return result.data; // Base64 encoded image data
    } catch (error) {
      chromeLog.error(`Screenshot capture failed for tab ${tabId}:`, error);
      throw new CaptureError(
        `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
        "screenshot",
      );
    } finally {
      // Clean up tab connection
      if (tabClient) {
        try {
          await tabClient.close();
        } catch (error) {
          chromeLog.debug(`Error closing tab connection: ${error}`);
        }
      }
    }
  }

  async captureHTML(
    tabId: string,
    options: HTMLCaptureOptions = {},
  ): Promise<string> {
    this.assertConnected();
    await this.findTabById(tabId);

    let tabClient: any = null;
    try {
      chromeLog.debug(
        `Capturing HTML from tab ${tabId} with options:`,
        options,
      );

      // Connect to the specific tab
      tabClient = await this.connectToTab(tabId);

      let htmlExpression = "document.documentElement.outerHTML";

      // If specific selectors are requested, extract only those
      if (options.selectors && options.selectors.length > 0) {
        const selectorsArray = JSON.stringify(options.selectors);
        htmlExpression = `
          (() => {
            const selectors = ${selectorsArray};
            const elements = [];
            selectors.forEach(selector => {
              try {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach(node => elements.push(node.outerHTML));
              } catch (e) {
                console.warn('Invalid selector:', selector);
              }
            });
            return elements.join('\\n');
          })()
        `;
      } else if (!options.includeScripts || !options.includeStyles) {
        // Filter out scripts and/or styles if requested
        htmlExpression = `
          (() => {
            const clone = document.documentElement.cloneNode(true);
            ${
              !options.includeScripts
                ? `
            const scripts = clone.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            `
                : ""
            }
            ${
              !options.includeStyles
                ? `
            const styles = clone.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(style => style.remove());
            const elementsWithStyle = clone.querySelectorAll('[style]');
            elementsWithStyle.forEach(el => el.removeAttribute('style'));
            `
                : ""
            }
            return '<!DOCTYPE html>\\n' + clone.outerHTML;
          })()
        `;
      }

      chromeLog.debug("Evaluating HTML extraction expression...");

      // Execute JavaScript to get HTML content
      const result = await tabClient.Runtime.evaluate({
        expression: htmlExpression,
        returnByValue: true,
        awaitPromise: false,
      });

      if (result.exceptionDetails) {
        throw new Error(
          `JavaScript execution failed: ${result.exceptionDetails.text}`,
        );
      }

      let htmlContent = result.result.value;

      // Pretty format if requested
      if (options.prettify && htmlContent) {
        try {
          // Basic HTML formatting - just add line breaks after tags
          htmlContent = htmlContent
            .replace(/></g, ">\n<")
            .replace(/^\s+|\s+$/gm, ""); // Trim whitespace
        } catch (formatError) {
          chromeLog.debug(
            "HTML formatting failed, returning unformatted:",
            formatError,
          );
        }
      }

      chromeLog.success(
        `HTML captured from tab ${tabId}, length: ${htmlContent.length}`,
      );
      return htmlContent;
    } catch (error) {
      chromeLog.error(`HTML capture failed for tab ${tabId}:`, error);
      throw new CaptureError(
        `Failed to capture HTML: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
        "html",
      );
    } finally {
      // Clean up tab connection
      if (tabClient) {
        try {
          await tabClient.close();
        } catch (error) {
          chromeLog.debug(`Error closing tab connection: ${error}`);
        }
      }
    }
  }

  async captureCSS(tabId: string, options: CSSCaptureOptions): Promise<string> {
    this.assertConnected();
    await this.findTabById(tabId);

    if (!options.selectors || options.selectors.length === 0) {
      throw new Error("CSS capture requires at least one selector");
    }

    let tabClient: any = null;
    try {
      chromeLog.debug(
        `Capturing CSS from tab ${tabId} for selectors:`,
        options.selectors,
      );

      // Connect to the specific tab
      tabClient = await this.connectToTab(tabId);

      const sanitizedSelectors = this.sanitizeSelectors(options.selectors);
      const selectorsArray = JSON.stringify(sanitizedSelectors);

      // Build JavaScript expression to extract CSS for selectors
      const cssExpression = `
        (() => {
          const selectors = ${selectorsArray};
          const cssRules = [];
          
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              if (elements.length === 0) {
                cssRules.push(\`/* No elements found for selector: \${selector} */\`);
                return;
              }
              
              // Get computed styles for the first matching element
              const element = elements[0];
              const computedStyle = window.getComputedStyle(element);
              
              const rules = [];
              const importantProps = [];
              
              // Extract all computed style properties
              for (let i = 0; i < computedStyle.length; i++) {
                const property = computedStyle[i];
                const value = computedStyle.getPropertyValue(property);
                const priority = computedStyle.getPropertyPriority(property);
                
                if (value && value !== 'initial' && value !== 'inherit') {
                  ${
                    options.includeComputed
                      ? `
                  rules.push(\`  \${property}: \${value}\${priority ? ' !' + priority : ''};\`);
                  `
                      : `
                  // Only include non-default values for basic extraction
                  if (!['auto', 'normal', 'none', '0px', 'transparent', 'rgba(0, 0, 0, 0)'].includes(value)) {
                    rules.push(\`  \${property}: \${value}\${priority ? ' !' + priority : ''};\`);
                  }
                  `
                  }
                }
              }
              
              ${
                options.includeInherited
                  ? `
              // Include inherited styles from parent elements
              let parent = element.parentElement;
              while (parent && parent !== document.body) {
                const parentStyle = window.getComputedStyle(parent);
                rules.push(\`  /* Inherited from parent \${parent.tagName.toLowerCase()} */\`);
                
                ['color', 'font-family', 'font-size', 'line-height', 'text-align'].forEach(prop => {
                  const value = parentStyle.getPropertyValue(prop);
                  if (value && value !== 'initial') {
                    rules.push(\`  \${prop}: \${value}; /* inherited */\`);
                  }
                });
                
                parent = parent.parentElement;
              }
              `
                  : ""
              }
              
              if (rules.length > 0) {
                cssRules.push(\`\${selector} {\n\${rules.join('\\n')}\n}\`);
              } else {
                cssRules.push(\`\${selector} {\n  /* No significant styles found */\n}\`);
              }
              
            } catch (e) {
              cssRules.push(\`/* Error processing selector \${selector}: \${e.message} */\`);
            }
          });
          
          return cssRules.join('\\n\\n');
        })()
      `;

      chromeLog.debug("Evaluating CSS extraction expression...");

      // Execute JavaScript to get CSS styles
      const result = await tabClient.Runtime.evaluate({
        expression: cssExpression,
        returnByValue: true,
        awaitPromise: false,
      });

      if (result.exceptionDetails) {
        throw new Error(
          `JavaScript execution failed: ${result.exceptionDetails.text}`,
        );
      }

      let cssContent = result.result.value;

      // Pretty format if requested
      if (options.prettify && cssContent) {
        try {
          // Basic CSS formatting
          cssContent = cssContent
            .replace(/\{\s+/g, " {\n  ")
            .replace(/;\s+/g, ";\n  ")
            .replace(/\s+\}/g, "\n}")
            .replace(/\}\s+/g, "}\n\n");
        } catch (formatError) {
          chromeLog.debug(
            "CSS formatting failed, returning unformatted:",
            formatError,
          );
        }
      }

      chromeLog.success(
        `CSS captured from tab ${tabId}, length: ${cssContent.length}`,
      );
      return cssContent;
    } catch (error) {
      chromeLog.error(`CSS capture failed for tab ${tabId}:`, error);
      throw new CaptureError(
        `Failed to capture CSS: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
        "css",
      );
    } finally {
      // Clean up tab connection
      if (tabClient) {
        try {
          await tabClient.close();
        } catch (error) {
          chromeLog.debug(`Error closing tab connection: ${error}`);
        }
      }
    }
  }

  /**
   * Set a tab as active/focused in the browser
   * This is safer than navigation as it only switches between existing tabs
   * @param tabId - ID of the tab to activate
   */
  async setActiveTab(tabId: string): Promise<void> {
    this.assertConnected();
    await this.findTabById(tabId); // Validate tab exists

    try {
      chromeLog.debug(`Setting tab ${tabId} as active...`);

      // Use Chrome's HTTP API to activate the tab
      const activateUrl = `http://localhost:${this.debugPort}/json/activate/${tabId}`;

      const response = await fetch(activateUrl, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to activate tab: HTTP ${response.status}`);
      }

      const result = await response.text();
      chromeLog.success(`Tab ${tabId} set as active. Response: ${result}`);
    } catch (error) {
      chromeLog.error(`Failed to set active tab ${tabId}:`, error);
      throw new BrowserConnectionError(
        `Failed to set active tab: ${error instanceof Error ? error.message : String(error)}`,
        "chrome",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async extractElements(
    tabId: string,
    selectors: string[],
  ): Promise<ElementInfo[]> {
    this.assertConnected();
    await this.findTabById(tabId);

    const sanitizedSelectors = this.sanitizeSelectors(selectors);
    if (sanitizedSelectors.length === 0) {
      throw new Error("No valid selectors provided");
    }

    let tabClient: any = null;
    try {
      chromeLog.debug(
        `Extracting elements from tab ${tabId} for selectors:`,
        sanitizedSelectors,
      );

      // Connect to the specific tab
      tabClient = await this.connectToTab(tabId);

      const selectorsArray = JSON.stringify(sanitizedSelectors);

      // Build JavaScript expression to extract comprehensive element information
      const extractionExpression = `
        (() => {
          const selectors = ${selectorsArray};
          const elementsInfo = [];
          
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              
              if (elements.length === 0) {
                elementsInfo.push({
                  selector,
                  tagName: null,
                  textContent: null,
                  error: 'No elements found for selector'
                });
                return;
              }
              
              // Extract info for all matching elements (up to 10 for performance)
              const maxElements = Math.min(elements.length, 10);
              
              for (let i = 0; i < maxElements; i++) {
                const element = elements[i];
                const computedStyle = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                // Extract key computed styles
                const styles = {};
                const importantStyleProps = [
                  'display', 'position', 'top', 'left', 'right', 'bottom',
                  'width', 'height', 'margin', 'padding', 'border',
                  'color', 'background-color', 'font-family', 'font-size',
                  'text-align', 'line-height', 'opacity', 'z-index',
                  'transform', 'transition', 'box-shadow', 'border-radius'
                ];
                
                importantStyleProps.forEach(prop => {
                  const value = computedStyle.getPropertyValue(prop);
                  if (value && value !== 'initial' && value !== 'auto' && value !== 'none') {
                    styles[prop] = value;
                  }
                });
                
                // Extract all attributes
                const attributes = {};
                for (let j = 0; j < element.attributes.length; j++) {
                  const attr = element.attributes[j];
                  attributes[attr.name] = attr.value;
                }
                
                // Get text content (trimmed and limited)
                let textContent = element.textContent || '';
                textContent = textContent.trim();
                if (textContent.length > 200) {
                  textContent = textContent.substring(0, 200) + '...';
                }
                
                const elementInfo = {
                  selector: elements.length === 1 ? selector : \`\${selector}:nth-child(\${i + 1})\`,
                  tagName: element.tagName.toLowerCase(),
                  textContent: textContent || null,
                  styles,
                  attributes,
                  boundingBox: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  },
                  isVisible: rect.width > 0 && rect.height > 0 && 
                           computedStyle.visibility !== 'hidden' && 
                           computedStyle.display !== 'none',
                  scrollPosition: {
                    scrollTop: element.scrollTop,
                    scrollLeft: element.scrollLeft
                  }
                };
                
                elementsInfo.push(elementInfo);
              }
              
            } catch (e) {
              elementsInfo.push({
                selector,
                tagName: null,
                textContent: null,
                error: \`Error processing selector: \${e.message}\`
              });
            }
          });
          
          return elementsInfo;
        })()
      `;

      chromeLog.debug("Evaluating element extraction expression...");

      // Execute JavaScript to extract element information
      const result = await tabClient.Runtime.evaluate({
        expression: extractionExpression,
        returnByValue: true,
        awaitPromise: false,
      });

      if (result.exceptionDetails) {
        throw new Error(
          `JavaScript execution failed: ${result.exceptionDetails.text}`,
        );
      }

      const extractedElements = result.result.value as ElementInfo[];

      // Filter out elements with errors and log warnings
      const validElements = extractedElements.filter((element) => {
        if ("error" in element) {
          chromeLog.debug(`Element extraction warning: ${element.error}`);
          return false;
        }
        return true;
      });

      chromeLog.success(
        `Extracted ${validElements.length} elements from tab ${tabId} (${extractedElements.length - validElements.length} had errors)`,
      );
      return validElements;
    } catch (error) {
      chromeLog.error(`Element extraction failed for tab ${tabId}:`, error);
      throw new CaptureError(
        `Failed to extract elements: ${error instanceof Error ? error.message : String(error)}`,
        tabId,
        "elements",
      );
    } finally {
      // Clean up tab connection
      if (tabClient) {
        try {
          await tabClient.close();
        } catch (error) {
          chromeLog.debug(`Error closing tab connection: ${error}`);
        }
      }
    }
  }
}
