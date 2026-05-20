export interface DownloadEvent {
  on(event: 'done' | 'updated', callback: (state: { state: string }) => void): void;
  once(event: 'done', callback: (state: { state: string }) => void): void;
  getFilename(): string;
  setSavePath(path: string): void;
  getSavePath(): string;
  getTotalBytes(): number;
  getReceivedBytes(): number;
  getState(): 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  getContentDisposition(): string;
  getURL(): string;
  getMimeType(): string;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  cancel(): void;
}

export interface CookieChangeInfo {
  cookie: {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
  };
  cause: 'overwrite' | 'expired' | 'evicted' | 'expired-overwrite' | 'insert' | 'explicit' | 'unknown';
  removed: boolean;
}

export interface ExtensionInfo {
  name: string;
  id: string;
  version: string;
  description?: string;
}

export interface ISession {
  onWillDownload(callback: (event: { item: DownloadEvent; itemIndex: number }) => void): () => void;
  loadExtension(path: string): Promise<ExtensionInfo>;
  onBeforeRequest(
    filter: { urls: string[] },
    listener: (details: { url: string; id: string }, callback: (response: { cancel?: boolean; redirectURL?: string }) => void) => void
  ): void;
  onBeforeSendHeaders(
    filter: { urls: string[] },
    listener: (details: { url: string; requestHeaders: Record<string, string> }, callback: (response: { requestHeaders: Record<string, string> }) => void) => void
  ): void;
  onCookiesChanged(listener: (event: CookieChangeInfo) => void): () => void;
  removeCookie(url: string, name: string): Promise<void>;
  clearAllCookies(): Promise<void>;
  setPermissionRequestHandler(handler: ((permission: string, callback: (granted: boolean) => void) => void) | null): void;
  setPreloads(paths: string[]): void;
}
