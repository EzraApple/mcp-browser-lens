#!/usr/bin/env node

/**
 * MCP Browser Lens CLI Entry Point
 * Command-line interface for starting the MCP server
 * 
 * All captured data is returned to the model for analysis.
 */

import { Command } from 'commander';
import { createBrowserLensServer } from '@/server.js';
import { logger } from '@/utils/logger.js';

const program = new Command();

program
  .name('mcp-browser-lens')
  .description('MCP server for visual browser tab inspection and capture')
  .version('0.1.0');

program
  .command('start', { isDefault: true })
  .description('Start the MCP server')
  .option('-d, --debug', 'Enable debug logging')
  .option('-p, --port <port>', 'Debug port for browser connection', '9222')
  .option('-b, --browser <type>', 'Preferred browser type', 'auto')
  .option('-t, --timeout <ms>', 'Operation timeout in milliseconds', '30000')
  .action(async (options) => {
    try {
      logger.ifDebug(() => {
        console.error('🚀 Starting MCP Browser Lens server...');
        console.error('📍 Debug logs will show browser detection and connection details');
      });
      
      if (options.debug) {
        logger.ifDebug(() => console.error('🐛 Debug mode enabled'));
      }

      const server = await createBrowserLensServer();
      
      logger.ifDebug(() => {
        console.error('✅ MCP Browser Lens server started successfully');
        console.error('📡 Server is ready to accept connections via stdio transport');
        console.error('🔗 Browser connections will be established when tools are first used');
      });
      
      // Start the server
      await server.run();
      
    } catch (error) {
      console.error('❌ Failed to start MCP Browser Lens server:');
      console.error(error instanceof Error ? error.message : String(error));
      console.error('\n💡 Troubleshooting:');
      console.error('1. Ensure Chrome is running with --remote-debugging-port=9222');
      console.error('2. Check http://localhost:9222/json/list shows your tabs');
      console.error('3. Try running: npm run dev test');
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test browser availability and capabilities')
  .option('-b, --browser <type>', 'Browser type to test', 'auto')
  .action(async (options) => {
    try {
      const { detectBestBrowser, detectAllBrowsers } = await import('@/core/capability-detector.js');
      const { testBrowserAvailability } = await import('@/core/browser-factory.js');
      
      console.error('Testing browser availability...\n');
      
      if (options.browser === 'auto') {
        // Test all browsers
        console.error('🔍 Scanning all supported browsers...\n');
        const browsers = await detectAllBrowsers();
        
        if (browsers.length === 0) {
          console.error('❌ No supported browsers found');
          console.error('\nTo use MCP Browser Lens, please:');
          console.error('1. Install Chrome, Edge, Brave, Arc, or Zen browser');
          console.error('2. Start the browser with remote debugging enabled:');
          console.error('   Chrome: --remote-debugging-port=9222');
          console.error('\n💡 Tip: Open Chrome and check http://localhost:9222/json/list');
          process.exit(1);
        }
        
        console.error(`Found ${browsers.length} available browser(s):\n`);
        
        for (const browser of browsers) {
          console.error(`✅ ${browser.name}`);
          console.error(`   Type: ${browser.type}`);
          console.error(`   Version: ${browser.version}`);
          console.error(`   Debug Port: ${browser.debugPort}`);
          console.error(`   Running: ${browser.isRunning ? 'Yes' : 'No'}`);
          console.error('');
        }
        
        // Show best browser
        const best = await detectBestBrowser();
        if (best) {
          console.error(`🎯 Best browser for MCP operations: ${best.name} (${best.type})`);
        }
        
      } else {
        // Test specific browser
        const isAvailable = await testBrowserAvailability(options.browser);
        
        if (isAvailable) {
          console.error(`✅ ${options.browser} is available and ready for MCP operations`);
        } else {
          console.error(`❌ ${options.browser} is not available`);
          console.error('\nTroubleshooting:');
          console.error(`1. Ensure ${options.browser} is installed`);
          console.error('2. Start the browser with remote debugging:');
          console.error('   --remote-debugging-port=9222');
          console.error('3. Check that no firewall is blocking port 9222');
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error('Error testing browsers:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show system information and supported features')
  .action(async () => {
    try {
      const { getPlatformCapabilities } = await import('@/core/capability-detector.js');
      const { getSupportedBrowserTypes } = await import('@/core/browser-factory.js');
      
      console.error('MCP Browser Lens System Information\n');
      
      // Platform info
      const platform = getPlatformCapabilities();
      console.error(`Platform: ${platform.platform}`);
      console.error(`Supported Browsers: ${platform.supportedBrowsers.join(', ')}`);
      console.error('');
      
      // Features
      console.error('Platform Features:');
      Object.entries(platform.features).forEach(([key, value]) => {
        console.error(`  ${key}: ${value ? '✅' : '❌'}`);
      });
      console.error('');
      
      // Supported browser types
      console.error('Supported Browser Types:');
      getSupportedBrowserTypes().forEach(type => {
        console.error(`  ${type}`);
      });
      console.error('');
      
      // MCP capabilities
      console.error('MCP Tools Available:');
      const tools = [
        'initialize_chrome_debugging - Start Chrome with debugging enabled (called automatically when needed)',
        'list_tabs - List all open browser tabs with titles and URLs',
        'capture_page_content - Extract HTML and CSS content from browser tabs',
        'capture_screenshot - Take high-quality screenshots of specific tabs',
        'extract_elements - Get detailed element information using CSS selectors',
        'scroll_page - Scroll pages (pixels, viewport, to elements, top/bottom)',
        'set_active_tab - Switch to a specific tab safely',
        'get_browser_capabilities - Check what browser features are available'
      ];
      tools.forEach(tool => {
        console.error(`  ${tool}`);
      });
      
    } catch (error) {
      console.error('Error getting system info:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);