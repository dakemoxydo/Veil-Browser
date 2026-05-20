import { session, Session, DownloadItem as ElectronDownloadItem, OnBeforeSendHeadersListenerDetails, OnBeforeRequestListenerDetails } from 'electron';
import { ISession, DownloadEvent, CookieChangeInfo, ExtensionInfo } from '../../core/ports/ISession';

class DownloadEventAdapter implements DownloadEvent {
  constructor(private downloadItem: ElectronDownloadItem) {}

  on(event: 'done' | 'updated', callback: (state: { state: string }) => void): void {
    if (event === 'done') {
      this.downloadItem.on('done', (_e, state) => callback({ state }));
    } else {
      this.downloadItem.on('updated', (_e, state) => callback({ state }));
    }
  }

  once(event: 'done', callback: (state: { state: string }) => void): void {
    this.downloadItem.once(event, (_e, state) => callback({ state }));
  }

  getFilename(): string { return this.downloadItem.getFilename(); }
  setSavePath(path: string): void { this.downloadItem.setSavePath(path); }
  getSavePath(): string { return this.downloadItem.getSavePath(); }
  getTotalBytes(): number { return this.downloadItem.getTotalBytes(); }
  getReceivedBytes(): number { return this.downloadItem.getReceivedBytes(); }
  getState(): 'progressing' | 'completed' | 'cancelled' | 'interrupted' { return this.downloadItem.getState() as 'progressing' | 'completed' | 'cancelled' | 'interrupted'; }
  getContentDisposition(): string { return this.downloadItem.getContentDisposition(); }
  getURL(): string { return this.downloadItem.getURL(); }
  getMimeType(): string { return this.downloadItem.getMimeType(); }
  pause(): void { this.downloadItem.pause(); }
  resume(): void { this.downloadItem.resume(); }
  isPaused(): boolean { return this.downloadItem.isPaused(); }
  cancel(): void { this.downloadItem.cancel(); }
}

export class ElectronSession implements ISession {
  private session: Session;
  private requestChain: ((details: OnBeforeRequestListenerDetails, callback: (response: { cancel?: boolean; redirectURL?: string }) => void) => void)[] = [];
  private sendHeadersChain: ((details: OnBeforeSendHeadersListenerDetails, callback: (response: { requestHeaders: Record<string, string> }) => void) => void)[] = [];

  constructor(partitionName?: string) {
    this.session = partitionName
      ? session.fromPartition(partitionName)
      : session.defaultSession;

    // Wire up request chain
    this.session.webRequest.onBeforeRequest((details, callback) => {
      if (this.requestChain.length === 0) {
        callback({});
        return;
      }
      let index = 0;
      const next = () => {
        if (index >= this.requestChain.length) {
          callback({});
          return;
        }
        this.requestChain[index++](details, (response) => {
          if (response.cancel || response.redirectURL) {
            callback(response);
          } else {
            next();
          }
        });
      };
      next();
    });

    // Wire up send-headers chain (accumulates header modifications)
    this.session.webRequest.onBeforeSendHeaders((details, callback) => {
      if (this.sendHeadersChain.length === 0) {
        callback({ requestHeaders: details.requestHeaders });
        return;
      }
      let index = 0;
      let currentHeaders = details.requestHeaders;
      const next = () => {
        if (index >= this.sendHeadersChain.length) {
          callback({ requestHeaders: currentHeaders });
          return;
        }
        this.sendHeadersChain[index++](details, (response) => {
          currentHeaders = response.requestHeaders;
          next();
        });
      };
      next();
    });
  }

  onWillDownload(callback: (event: { item: DownloadEvent; itemIndex: number }) => void): () => void {
    const handler = (_event: Electron.Event, item: ElectronDownloadItem) => {
      callback({
        item: new DownloadEventAdapter(item),
        itemIndex: 0,
      });
    };

    this.session.on('will-download', handler);
    return () => {
      this.session.removeListener('will-download', handler);
    };
  }

  loadExtension(path: string): Promise<ExtensionInfo> {
    return (this.session as unknown as { loadExtension: (path: string) => Promise<{ name: string; id: string; version: string; description?: string }> })
      .loadExtension(path)
      .then((ext: { name: string; id: string; version: string; description?: string }) => ({
        name: ext.name,
        id: ext.id,
        version: ext.version,
        description: ext.description,
      }));
  }

  onBeforeRequest(
    filter: { urls: string[] },
    listener: (details: { url: string; id: string }, callback: (response: { cancel?: boolean; redirectURL?: string }) => void) => void
  ): void {
    this.requestChain.push((details, callback) => {
      listener({ url: details.url, id: details.id.toString() }, callback);
    });
  }

  onBeforeSendHeaders(
    _filter: { urls: string[] },
    listener: (details: { url: string; requestHeaders: Record<string, string> }, callback: (response: { requestHeaders: Record<string, string> }) => void) => void
  ): void {
    this.sendHeadersChain.push((details, callback) => {
      listener({ url: details.url, requestHeaders: details.requestHeaders }, callback);
    });
  }

  onCookiesChanged(listener: (event: CookieChangeInfo) => void): () => void {
    const wrappedListener = (_event: Electron.Event, cookie: { name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean }, cause: string, removed: boolean) => {
      listener({
        cookie: {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
        },
        cause: cause as CookieChangeInfo['cause'],
        removed,
      });
    };

    this.session.cookies.on('changed', wrappedListener as (...args: unknown[]) => void);
    return () => {
      this.session.cookies.removeListener('changed', wrappedListener as (...args: unknown[]) => void);
    };
  }

  removeCookie(url: string, name: string): Promise<void> {
    return this.session.cookies.remove(url, name);
  }

  clearAllCookies(): Promise<void> {
    return this.session.clearStorageData({ storages: ['cookies'] });
  }

  clearCache(): Promise<void> {
    return this.session.clearStorageData({ storages: ['localstorage', 'indexdb', 'shadercache', 'serviceworkers', 'cachestorage'] });
  }

  async getCookies(domain?: string): Promise<{ name: string; value: string; domain: string; path: string; expires: number; secure: boolean; httpOnly: boolean }[]> {
    const filter = domain ? { domain } : {};
    const cookies = await this.session.cookies.get(filter);
    return cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '',
      path: c.path || '',
      expires: c.expirationDate || -1,
      secure: c.secure ?? false,
      httpOnly: c.httpOnly ?? false,
    }));
  }

  setPermissionRequestHandler(
    handler: ((permission: string, callback: (granted: boolean) => void) => void) | null
  ): void {
    if (handler) {
      this.session.setPermissionRequestHandler((_webContents, permission, callback) => {
        handler(permission, (granted: boolean) => callback(granted));
      });
    } else {
      this.session.setPermissionRequestHandler(null);
    }
  }

  setPreloads(paths: string[]): void {
    this.session.setPreloads(paths);
  }

  destroy(): void {
    this.requestChain = [];
    this.sendHeadersChain = [];
  }
}
