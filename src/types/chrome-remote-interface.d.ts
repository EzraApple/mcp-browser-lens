/**
 * Type declarations for chrome-remote-interface
 * Since the module doesn't provide official TypeScript types
 */

declare module 'chrome-remote-interface' {
  interface CDPOptions {
    port?: number;
    host?: string;
    tab?: string;
    secure?: boolean;
    target?: any;
  }

  interface CDPClient {
    Page: any;
    Runtime: any;
    DOM: any;
    close(): Promise<void>;
    [key: string]: any;
  }

  function CDP(options?: CDPOptions): Promise<CDPClient>;

  export = CDP;
}