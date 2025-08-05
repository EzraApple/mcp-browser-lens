/**
 * MCP Browser Lens Server - Main MCP server implementation
 * Exposes browser inspection tools through the Model Context Protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { useBrowserTools } from '@/core/browser-factory.js';
import { BrowserType } from '@/interfaces/types.js';
import { BrowserTools } from '@/interfaces/browser-tools.js';
import { serverLog } from '@/utils/logger.js';
import { chromeLauncher } from '@/utils/chrome-launcher.js';

export class BrowserLensServer {
  private server: McpServer;
  private browserTools: BrowserTools | null = null;
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
   * Safely execute a browser operation with error handling
   * Ensures all errors are caught and returned as proper MCP responses
   */
  private async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackError: string = "Unknown error occurred"
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      serverLog.error(`${operationName} failed:`, error);
      
      // Always return a structured error instead of throwing
      throw new Error(`${operationName} failed: ${errorMessage}`);
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



  private setupTools(): void {
    // List all open browser tabs
    this.server.tool(
      'list_tabs',
      'List all open browser tabs across supported browsers',
      {
        browserType: z
          .enum(['chrome', 'auto'])
          .default('auto')
          .describe('Browser type to target - Chrome with auto-launch and debugging'),
      },
      async ({ browserType }) => {
        return await this.safeExecute(async () => {
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
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }, 'List tabs').catch(error => {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'Failed to list tabs',
                  message: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now()
                }, null, 2),
              },
            ],
          };
        });
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
          .describe('Browser type that owns the tab - Chrome with auto-launch and debugging'),
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
            

          }

          // Capture CSS if requested
          if (includeCSS && cssSelectors && cssSelectors.length > 0) {
            const cssOptions = { selectors: cssSelectors, prettify };
            css = await tools.captureCSS(tabId, cssOptions);
            

          }

          const response = {
            success: true,
            tabId,
            timestamp: Date.now(),
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
          .describe('Browser type that owns the tab - Chrome with auto-launch and debugging'),
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
          .describe('Browser type that owns the tab - Chrome with auto-launch and debugging'),
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
          .describe('Browser type that owns the tab - Chrome with auto-launch and debugging'),
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
          .describe('Browser type that owns the tab - Chrome with auto-launch and debugging'),
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
                type: 'text' as const,
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
          .describe('Browser type to check - Chrome with auto-launch and debugging'),
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



  /**
   * Initialize Chrome debugging before starting the MCP server
   * Ensures Chrome is available for browser operations
   */
  private async initializeChromeDebugging(): Promise<void> {
    try {
      serverLog.debug('Initializing Chrome debugging for MCP Browser Lens...');
      
      const result = await chromeLauncher.ensureChromeDebugging();
      
      if (result.launched) {
        serverLog.success('🚀 Chrome launched successfully with debugging enabled');
        if (result.welcomePageOpened) {
          serverLog.success('📄 Welcome page opened - MCP capabilities explained to user');
        }
      } else if (result.wasRunning) {
        serverLog.success('✅ Chrome already running with debugging enabled');
        if (result.welcomePageOpened) {
          serverLog.success('📄 Welcome page opened in existing Chrome instance');
        }
      } else {
        serverLog.error('❌ Failed to establish Chrome debugging connection:', result.error);
        // Don't throw here - allow server to start anyway for manual Chrome setup
        serverLog.debug('Server will continue - Chrome can be started manually if needed');
      }
    } catch (error) {
      serverLog.error('Chrome initialization failed:', error);
      // Continue anyway - allow fallback to manual Chrome setup
      serverLog.debug('Continuing with server startup - Chrome debugging can be enabled manually');
    }
  }

  async run(): Promise<void> {
    // Initialize Chrome debugging before starting MCP server
    await this.initializeChromeDebugging();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    serverLog.success('🔍 MCP Browser Lens server running on stdio');
    serverLog.debug('Ready to assist with browser automation and web content analysis');
  }
}

// Export the server instance
export async function createBrowserLensServer(): Promise<BrowserLensServer> {
  return new BrowserLensServer();
}