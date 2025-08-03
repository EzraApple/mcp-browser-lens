/**
 * Custom logging utility for MCP Browser Lens
 * Provides development-only logging to keep production output clean
 */



class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Debug level logging - only shown in development
   */
  debug(prefix: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[${prefix}] ${message}`, ...args);
    }
  }

  /**
   * Info level logging - only shown in development
   */
  info(prefix: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[${prefix}] ${message}`, ...args);
    }
  }

  /**
   * Warning level logging - shown in development, errors written to stderr in production
   */
  warn(prefix: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[${prefix}] ⚠️ ${message}`, ...args);
    } else {
      console.error(`[${prefix}] Warning: ${message}`, ...args);
    }
  }

  /**
   * Error level logging - always shown (stderr)
   */
  error(prefix: string, message: string, ...args: unknown[]): void {
    console.error(`[${prefix}] ❌ ${message}`, ...args);
  }

  /**
   * Success logging - only shown in development
   */
  success(prefix: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[${prefix}] ✅ ${message}`, ...args);
    }
  }

  /**
   * Check if we're in development mode
   */
  get isDebug(): boolean {
    return this.isDevelopment;
  }

  /**
   * Conditional logging - only runs the callback in development
   */
  ifDebug(callback: () => void): void {
    if (this.isDevelopment) {
      callback();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export helper functions for common prefixes
export const browserLog = {
  debug: (message: string, ...args: unknown[]) =>
    logger.debug("BROWSER-DETECT", message, ...args),
  success: (message: string, ...args: unknown[]) =>
    logger.success("BROWSER-DETECT", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    logger.error("BROWSER-DETECT", message, ...args),
};

export const chromeLog = {
  debug: (message: string, ...args: unknown[]) =>
    logger.debug("CHROME", message, ...args),
  success: (message: string, ...args: unknown[]) =>
    logger.success("CHROME", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    logger.error("CHROME", message, ...args),
};

export const factoryLog = {
  debug: (message: string, ...args: unknown[]) =>
    logger.debug("BROWSER-FACTORY", message, ...args),
  success: (message: string, ...args: unknown[]) =>
    logger.success("BROWSER-FACTORY", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    logger.error("BROWSER-FACTORY", message, ...args),
};

export const serverLog = {
  debug: (message: string, ...args: unknown[]) =>
    logger.debug("MCP-SERVER", message, ...args),
  success: (message: string, ...args: unknown[]) =>
    logger.success("MCP-SERVER", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    logger.error("MCP-SERVER", message, ...args),
  info: (message: string, ...args: unknown[]) =>
    logger.info("MCP-SERVER", message, ...args),
};
