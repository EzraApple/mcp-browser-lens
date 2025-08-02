/**
 * Core type definitions for the MCP Browser Lens project
 * Defines fundamental data structures used throughout the application
 */

export interface TabInfo {
  /** Unique identifier for the browser tab */
  id: string;
  /** Current URL of the tab */
  url: string;
  /** Page title */
  title: string;
  /** Whether the tab is currently active/focused */
  active: boolean;
  /** Favicon URL if available */
  favIconUrl?: string;
  /** Browser type that owns this tab */
  browserType: BrowserType;
  /** Window ID that contains this tab */
  windowId?: string;
}

export interface CaptureOptions {
  /** Image format for screenshots */
  format?: "png" | "jpeg" | "webp";
  /** Image quality (0-100) for lossy formats */
  quality?: number;
  /** Capture full page or just viewport */
  fullPage?: boolean;
  /** Clip to specific area */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Device pixel ratio for high-DPI captures */
  devicePixelRatio?: number;
}

export interface HTMLCaptureOptions {
  /** Include inline styles in the output */
  includeStyles?: boolean;
  /** Include script tags in the output */
  includeScripts?: boolean;
  /** Pretty format the HTML output */
  prettify?: boolean;
  /** Extract only specific selectors */
  selectors?: string[];
}

export interface CSSCaptureOptions {
  /** CSS selectors to target */
  selectors: string[];
  /** Include computed styles */
  includeComputed?: boolean;
  /** Include inherited styles */
  includeInherited?: boolean;
  /** Format output CSS */
  prettify?: boolean;
}

export interface ElementInfo {
  /** CSS selector for the element */
  selector: string;
  /** Element tag name */
  tagName: string;
  /** Element text content */
  textContent?: string;
  /** Computed styles for the element */
  styles?: Record<string, string>;
  /** Element attributes */
  attributes?: Record<string, string>;
  /** Bounding box information */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CaptureResult {
  /** Base64 encoded screenshot data */
  screenshot?: string;
  /** Extracted HTML content */
  html?: string;
  /** Extracted CSS styles */
  css?: string;
  /** Extracted element information */
  elements?: ElementInfo[];
  /** Timestamp of capture */
  timestamp: number;
  /** Source tab information */
  tabInfo: TabInfo;
}

// NavigationOptions removed for security - navigation functionality replaced with setActiveTab

export type BrowserType = "chrome" | "auto";

// Future browser types (to be enabled in later phases):
// | 'safari' | 'firefox' | 'arc' | 'zen'

export interface BrowserDetectionResult {
  /** Browser type detected */
  type: BrowserType;
  /** Display name */
  name: string;
  /** Version if available */
  version?: string;
  /** Executable path */
  executablePath?: string | undefined;
  /** Whether the browser is currently running */
  isRunning: boolean;
  /** Debug port if available */
  debugPort?: number;
}

export interface ServerInfo {
  /** Port number */
  port: number;
  /** Protocol (http/https) */
  protocol: "http" | "https";
  /** Service name if detected */
  name?: string;
  /** Whether the server is responsive */
  isActive: boolean;
}

export class BrowserConnectionError extends Error {
  constructor(
    message: string,
    public browserType: BrowserType,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "BrowserConnectionError";
  }
}

export class TabNotFoundError extends Error {
  constructor(
    message: string,
    public tabId: string,
  ) {
    super(message);
    this.name = "TabNotFoundError";
  }
}

export class CaptureError extends Error {
  constructor(
    message: string,
    public tabId: string,
    public captureType: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}
