/**
 * MCP Browser Lens Server - Main MCP server implementation
 * Exposes browser inspection tools through the Model Context Protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { useBrowserTools } from '@/core/browser-factory.js';
import { BrowserType } from '@/interfaces/types.js';
import { BrowserTools } from '@/interfaces/browser-tools.js';
import { serverLog } from '@/utils/logger.js';

// Feature flag for development mode captures - enabled for development
const ENABLE_CAPTURE_SAVING = true;

export class BrowserLensServer {
  private server: McpServer;
  private browserTools: BrowserTools | null = null;
  private captureDir: string = 'captured';
  private isShuttingDown: boolean = false;

  constructor() {
    this.server = new McpServer(
      {
        name: 'mcp-browser-lens',
        version: '0.1.0',
      },
      {
        instructions: 'Use this server to interact with browser tabs - list, capture, navigate, and analyze web content.',
      }
    );

    this.setupTools();
    this.setupShutdownHandlers();
    
    if (ENABLE_CAPTURE_SAVING) {
      this.initializeCaptureDirectory().catch(error => {
        serverLog.error('Failed to initialize capture directory:', error);
      });
    }
  }

  private async getBrowserTools(browserType?: BrowserType): Promise<BrowserTools> {
    if (!this.browserTools) {
      try {
        serverLog.debug('Initializing browser tools...');
        this.browserTools = await useBrowserTools(browserType);
        serverLog.success('Browser tools initialized successfully');
      } catch (error) {
        serverLog.error('Failed to initialize browser tools:', error);
        throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return this.browserTools;
  }

  /**
   * Initialize capture directory structure
   */
  private async initializeCaptureDirectory(): Promise<void> {
    if (!ENABLE_CAPTURE_SAVING) return;

    try {
      const directories = [
        this.captureDir,
        path.join(this.captureDir, 'screenshots'),
        path.join(this.captureDir, 'html'),
        path.join(this.captureDir, 'css')
      ];

      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
      }

      serverLog.success(`Capture directories initialized at: ${this.captureDir}`);
    } catch (error) {
      serverLog.error('Failed to create capture directories:', error);
      throw error;
    }
  }

  /**
   * Setup shutdown handlers for cleanup
   */
  private setupShutdownHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      serverLog.info(`Received ${signal}, initiating graceful shutdown...`);
      
      try {
        // Disconnect browser tools
        if (this.browserTools) {
          await this.browserTools.disconnect();
          serverLog.info('Browser tools disconnected');
        }

        // Clean up capture directory if enabled
        if (ENABLE_CAPTURE_SAVING) {
          await this.cleanupCaptureDirectory();
        }

        serverLog.success('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        serverLog.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('beforeExit', () => gracefulShutdown('beforeExit'));
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      serverLog.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      serverLog.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Clean up capture directory on shutdown
   */
  private async cleanupCaptureDirectory(): Promise<void> {
    if (!ENABLE_CAPTURE_SAVING) return;

    try {
      const exists = await fs.access(this.captureDir).then(() => true).catch(() => false);
      if (exists) {
        await fs.rm(this.captureDir, { recursive: true, force: true });
        serverLog.info(`Cleaned up capture directory: ${this.captureDir}`);
      }
    } catch (error) {
      serverLog.error('Failed to cleanup capture directory:', error);
    }
  }

  private setupTools(): void {
    // List all open browser tabs
    this.server.tool(
      'list_tabs',
      'List all open browser tabs across supported browsers',
      {
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type to target - currently only Chrome is supported'),
      },
      async ({ browserType }) => {
        try {
          const tools = await this.getBrowserTools(browserType);
          const tabs = await tools.listTabs();
          
          const result = {
            tabs: tabs,
            browserType: tools.getBrowserType(),
            count: tabs.length,
            timestamp: Date.now()
          };

          serverLog.info(`Listed ${tabs.length} tabs from ${tools.getBrowserType()}`);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          serverLog.error('Failed to list tabs:', error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to list tabs',
                  message: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        }
      }
    );

    // Capture page content (HTML + CSS)
    this.server.tool(
      'capture_page_content',
      'Extract HTML and CSS content from a browser tab. Note: This captures the content of the active tab. To capture content from a different tab, use set_active_tab first to make it active.',
      {
        tabId: z.string().describe('ID of the tab to extract content from'),
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type that owns the tab - currently only Chrome is supported'),
        includeHTML: z.boolean().default(true).describe('Include HTML content extraction'),
        includeCSS: z.boolean().default(false).describe('Include CSS styles extraction'),
        cssSelectors: z.array(z.string()).optional().describe('CSS selectors to extract styles for'),
        includeStyles: z.boolean().default(true).describe('Include inline styles in HTML'),
        includeScripts: z.boolean().default(false).describe('Include script tags in HTML'),
        prettify: z.boolean().default(true).describe('Pretty format the output'),
      },
      async ({ tabId, browserType, includeHTML, includeCSS, cssSelectors, includeStyles, includeScripts, prettify }) => {
        try {
          const tools = await this.getBrowserTools(browserType);
          
          serverLog.info(`Capturing page content from tab ${tabId}`, { includeHTML, includeCSS, selectorCount: cssSelectors?.length || 0 });

          let html = null;
          let css = null;

          // Capture HTML if requested
          if (includeHTML) {
            const htmlOptions = { includeStyles, includeScripts, prettify };
            html = await tools.captureHTML(tabId, htmlOptions);
            
            if (ENABLE_CAPTURE_SAVING) {
              try {
                const filename = `html_${tabId}_${Date.now()}.html`;
                await this.saveHTMLToFile(html, filename);
              } catch (saveError) {
                serverLog.error('Failed to save HTML:', saveError);
              }
            }
          }

          // Capture CSS if requested
          if (includeCSS && cssSelectors && cssSelectors.length > 0) {
            const cssOptions = { selectors: cssSelectors, prettify };
            css = await tools.captureCSS(tabId, cssOptions);
            
            if (ENABLE_CAPTURE_SAVING) {
              try {
                const filename = `css_${tabId}_${Date.now()}.css`;
                await this.saveCSSToFile(css, filename);
              } catch (saveError) {
                serverLog.error('Failed to save CSS:', saveError);
              }
            }
          }

          const response = {
            success: true,
            tabId,
            timestamp: Date.now(),
            savedToLocal: ENABLE_CAPTURE_SAVING,
            // Include the actual captured data for the model
            html: html,
            css: css,
            htmlLength: html ? html.length : 0,
            cssLength: css ? css.length : 0,
            hasHTML: !!html,
            hasCSS: !!css,
            htmlPreview: html ? html.substring(0, 500) + (html.length > 500 ? '...' : '') : null
          };

          serverLog.success(`Page content captured from tab ${tabId}`);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          serverLog.error(`Failed to capture page content from tab ${tabId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to capture page content',
                  tabId,
                  message: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        }
      }
    );

    // Capture screenshot only
    this.server.tool(
      'capture_screenshot',
      'Capture a screenshot of a browser tab. Note: This captures the content of the active tab. To screenshot a different tab, use set_active_tab first to make it active.',
      {
        tabId: z.string().describe('ID of the tab to capture'),
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type that owns the tab - currently only Chrome is supported'),
        fullPage: z.boolean().default(false).describe('Capture full page or just viewport'),
        format: z.enum(['png', 'jpeg', 'webp']).default('png').describe('Image format'),
        quality: z.number().min(0).max(100).optional().describe('Image quality for lossy formats'),
      },
      async ({ tabId, browserType, fullPage, format, quality }) => {
        const tools = await this.getBrowserTools(browserType);
        const options: any = { format, fullPage };
        if (quality !== undefined) {
          options.quality = quality;
        }
        const screenshot = await tools.captureScreenshot(tabId, options);
        
        // Save to captured directory
        const filename = `screenshot_${tabId}_${Date.now()}.${format}`;
        if (ENABLE_CAPTURE_SAVING) {
          try {
            await this.saveScreenshotToFile(screenshot, filename);
          } catch (saveError) {
            serverLog.error('Failed to save screenshot:', saveError);
          }
        }

        return {
          content: [
            {
              type: 'image',
              data: screenshot,
              mimeType: `image/${format}`
            },
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                tabId: tabId,
                format: format,
                savedAs: ENABLE_CAPTURE_SAVING ? filename : null,
                savedToLocal: ENABLE_CAPTURE_SAVING,
                timestamp: Date.now()
              }, null, 2),
            },
          ],
        };
      }
    );



    // Set active tab
    this.server.tool(
      'set_active_tab',
      'Set a browser tab as active/focused - safer than navigation',
      {
        tabId: z.string().describe('ID of the tab to set as active'),
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type that owns the tab - currently only Chrome is supported'),
      },
      async ({ tabId, browserType }) => {
        const tools = await this.getBrowserTools(browserType);
        await tools.setActiveTab(tabId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                tabId: tabId,
                setAsActive: true,
                timestamp: Date.now()
              }, null, 2),
            },
          ],
        };
      }
    );

    // Extract elements from a tab
    this.server.tool(
      'extract_elements',
      'Extract detailed information about elements using CSS selectors. Note: This extracts elements from the active tab. To extract from a different tab, use set_active_tab first to make it active.',
      {
        tabId: z.string().describe('ID of the tab to extract elements from'),
        selectors: z.array(z.string()).describe('CSS selectors for elements to extract'),
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type that owns the tab - currently only Chrome is supported'),
      },
      async ({ tabId, selectors, browserType }) => {
        try {
          const tools = await this.getBrowserTools(browserType);
          const elements = await tools.extractElements(tabId, selectors);

          serverLog.info(`Extracted ${elements.length} elements from tab ${tabId} using ${selectors.length} selectors`);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  tabId,
                  selectors,
                  elements, // Full element data for the model
                  found: elements.length,
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          serverLog.error(`Failed to extract elements from tab ${tabId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to extract elements',
                  tabId,
                  selectors,
                  message: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        }
      }
    );

    // Scroll page in a browser tab
    this.server.tool(
      'scroll_page',
      'Scroll the page in a browser tab using various methods. Note: This scrolls the active tab. To scroll a different tab, use set_active_tab first.',
      {
        tabId: z.string().describe('ID of the tab to scroll'),
        scrollType: z
          .enum(['pixels', 'coordinates', 'viewport', 'element', 'top', 'bottom'])
          .describe(
            'Type of scroll: pixels (relative), coordinates (absolute), viewport (page up/down), element (scroll to element), top (scroll to top), bottom (scroll to bottom)'
          ),
        x: z.number().optional().describe('X coordinate or offset (for pixels/coordinates scrolling)'),
        y: z.number().optional().describe('Y coordinate or offset (for pixels/coordinates/viewport scrolling)'),
        selector: z.string().optional().describe('CSS selector for element scrolling (required for element type)'),
        smooth: z.boolean().default(true).describe('Use smooth scrolling animation'),
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type that owns the tab - currently only Chrome is supported'),
      },
      async ({ tabId, scrollType, x, y, selector, smooth, browserType }) => {
        try {
          const tools = await this.getBrowserTools(browserType);
          
          // Build options object with only defined values
          const scrollOptions: any = { scrollType, smooth };
          if (x !== undefined) scrollOptions.x = x;
          if (y !== undefined) scrollOptions.y = y;
          if (selector !== undefined) scrollOptions.selector = selector;
          
          const result = await tools.scrollPage(tabId, scrollOptions);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          serverLog.error(`Failed to scroll page in tab ${tabId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to scroll page',
                  tabId,
                  scrollType,
                  message: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        }
      }
    );

    // Get browser capabilities
    this.server.tool(
      'get_browser_capabilities',
      'Get capabilities of available browsers',
      {
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type to check - currently only Chrome is supported'),
      },
      async ({ browserType }) => {
        const tools = await this.getBrowserTools(browserType);
        const capabilities = tools.getCapabilities();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                browserType: tools.getBrowserType(),
                capabilities: capabilities,
                timestamp: Date.now()
              }, null, 2),
            },
          ],
        };
      }
    );
  }

  // Helper methods for saving captured content locally

  private async saveScreenshotToFile(screenshot: string, filename: string): Promise<void> {
    if (!ENABLE_CAPTURE_SAVING) {
      serverLog.debug(`Capture saving disabled - would save screenshot: ${filename}`);
      return;
    }

    try {
      const filePath = path.join(this.captureDir, 'screenshots', filename);
      
      // Convert base64 to buffer and save
      const buffer = Buffer.from(screenshot, 'base64');
      await fs.writeFile(filePath, buffer);
      
      serverLog.success(`Screenshot saved: ${filePath}`);
    } catch (error) {
      serverLog.error(`Failed to save screenshot ${filename}:`, error);
      throw error;
    }
  }

  private async saveHTMLToFile(html: string, filename: string): Promise<void> {
    if (!ENABLE_CAPTURE_SAVING) {
      serverLog.debug(`Capture saving disabled - would save HTML: ${filename}`);
      return;
    }

    try {
      const filePath = path.join(this.captureDir, 'html', filename);
      await fs.writeFile(filePath, html, 'utf8');
      
      serverLog.success(`HTML saved: ${filePath}`);
    } catch (error) {
      serverLog.error(`Failed to save HTML ${filename}:`, error);
      throw error;
    }
  }

  private async saveCSSToFile(css: string, filename: string): Promise<void> {
    if (!ENABLE_CAPTURE_SAVING) {
      serverLog.debug(`Capture saving disabled - would save CSS: ${filename}`);
      return;
    }

    try {
      const filePath = path.join(this.captureDir, 'css', filename);
      await fs.writeFile(filePath, css, 'utf8');
      
      serverLog.success(`CSS saved: ${filePath}`);
    } catch (error) {
      serverLog.error(`Failed to save CSS ${filename}:`, error);
      throw error;
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    serverLog.success('MCP Browser Lens server running on stdio');
  }
}

// Export the server instance
export async function createBrowserLensServer(): Promise<BrowserLensServer> {
  return new BrowserLensServer();
}