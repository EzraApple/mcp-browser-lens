/**
 * Browser capability definitions and detection interfaces
 * Used to determine what features each browser provider supports
 */

export interface BrowserCapabilities {
  /** Browser can list open tabs */
  canListTabs: boolean;
  /** Browser can capture screenshots */
  canCaptureScreenshots: boolean;
  /** Browser can extract HTML content */
  canCaptureHTML: boolean;
  /** Browser can extract CSS styles */
  canCaptureCSS: boolean;
  /** Browser can navigate tabs to new URLs */
  canNavigate: boolean;
  /** Browser can extract specific element information */
  canExtractElements: boolean;
  /** Browser can inject JavaScript for advanced extraction */
  canInjectJavaScript: boolean;
  /** Browser supports full page screenshots */
  canCaptureFullPage: boolean;
  /** Browser can detect localhost development servers */
  canDetectLocalhost: boolean;
  /** Supported image formats for screenshots */
  supportedImageFormats: ("png" | "jpeg" | "webp")[];
  /** Maximum screenshot dimensions */
  maxScreenshotDimensions?: {
    width: number;
    height: number;
  };
  /** Browser-specific limitations or notes */
  limitations: string[];
}

export interface CapabilityScore {
  /** Overall capability score (0-100) */
  score: number;
  /** Individual feature scores */
  features: {
    tabManagement: number;
    screenshotCapture: number;
    contentExtraction: number;
    navigation: number;
    performance: number;
  };
  /** Reasons for the score */
  reasoning: string[];
}

export interface PlatformCapabilities {
  /** Platform name */
  platform: "macos" | "windows" | "linux";
  /** Supported browsers on this platform */
  supportedBrowsers: BrowserType[];
  /** Platform-specific features */
  features: {
    /** Can use AppleScript for browser automation */
    hasAppleScript?: boolean;
    /** Can use PowerShell for browser automation */
    hasPowerShell?: boolean;
    /** Can use X11/Wayland for screen capture */
    hasX11?: boolean;
    /** Native screen capture API available */
    hasNativeScreenCapture: boolean;
  };
  /** Platform-specific browser configurations */
  browserConfigs: Record<
    Exclude<BrowserType, "auto">, // "auto" is not a real browser, exclude it
    {
      /** Default debug port */
      defaultPort?: number;
      /** Installation paths to check */
      installPaths: string[];
      /** Process names to detect */
      processNames: string[];
      /** Launch arguments for enabling remote debugging */
      debugLaunchArgs?: string[];
    }
  >;
}

export const TIER_1_CAPABILITIES: BrowserCapabilities = {
  canListTabs: true,
  canCaptureScreenshots: true,
  canCaptureHTML: true,
  canCaptureCSS: true,
  canNavigate: true,
  canExtractElements: true,
  canInjectJavaScript: true,
  canCaptureFullPage: true,
  canDetectLocalhost: true,
  supportedImageFormats: ["png", "jpeg", "webp"],
  limitations: [],
};

export const TIER_2_CAPABILITIES: BrowserCapabilities = {
  canListTabs: true,
  canCaptureScreenshots: true,
  canCaptureHTML: true,
  canCaptureCSS: false,
  canNavigate: true,
  canExtractElements: false,
  canInjectJavaScript: false,
  canCaptureFullPage: true,
  canDetectLocalhost: false,
  supportedImageFormats: ["png"],
  limitations: ["Limited CSS extraction", "No JavaScript injection"],
};

export const FALLBACK_CAPABILITIES: BrowserCapabilities = {
  canListTabs: false,
  canCaptureScreenshots: true,
  canCaptureHTML: false,
  canCaptureCSS: false,
  canNavigate: false,
  canExtractElements: false,
  canInjectJavaScript: false,
  canCaptureFullPage: false,
  canDetectLocalhost: true,
  supportedImageFormats: ["png"],
  limitations: [
    "Screen capture only",
    "No browser integration",
    "No tab management",
    "No content extraction",
  ],
};

export type BrowserType =
  | "chrome"
  | "auto";
  // Future browsers can be added here:
  // | "safari" | "firefox" | "arc" | "zen"
