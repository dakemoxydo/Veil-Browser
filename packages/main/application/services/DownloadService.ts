import { app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { VeilAction, Download } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { ISession } from '../../core/ports/ISession';
import { IDownloadRepository } from '../../core/repositories/IDownloadRepository';
import { BaseService } from '../../core/BaseService';

export class DownloadService extends BaseService {
  public name = 'DownloadService';
  private cleanupDownloadListener: (() => void) | null = null;
  private listenerCleanups: Array<() => void> = [];
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private session: ISession,
    private downloadRepo: IDownloadRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
  }

  public async init() {
    this.logger.info('DownloadService initialized');
    this.setupDownloadListener();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.listenerCleanups.push(
      this.eventBus.on(EventTypes.DOWNLOAD_STARTED, (data: Download) => {
        this.logger.debug(`Download started: ${data.filename}`);
      }),
      this.eventBus.on(EventTypes.DOWNLOAD_COMPLETED, (data: Download) => {
        this.logger.info(`Download completed: ${data.filename}`);
      }),
    );
  }

  public destroy(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups = [];
    if (this.cleanupDownloadListener) {
      this.cleanupDownloadListener();
      this.cleanupDownloadListener = null;
    }
  }

  private setupDownloadListener() {
    this.cleanupDownloadListener = this.session.onWillDownload(({ item }) => {
      const settings = this.stateBroadcaster!.getState().settings;
      const downloadDir = settings?.general?.downloadPath || app.getPath('downloads');
      // Sanitize filename — prevent path traversal from Content-Disposition
      let filename = path.basename(item.getFilename());
      // Reject empty or dot-only filenames
      if (!filename || filename === '.' || filename === '..') {
        filename = 'download';
      }
      let filePath = path.join(downloadDir, filename);
      // Avoid filename collision — add (1), (2), etc.
      let counter = 1;
      while (fs.existsSync(filePath)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        filename = `${base} (${counter})${ext}`;
        filePath = path.join(downloadDir, filename);
        counter++;
      }
      const download = Download.create(filename, item.getURL(), filePath, item.getTotalBytes());

      this.downloadRepo.add(download);
      this.broadcastDownloads();
      this.eventBus.emit(EventTypes.DOWNLOAD_STARTED, download.toJSON());

      item.setSavePath(filePath);

      item.on('updated', ({ state }) => {
        if (state === 'progressing') {
          const existing = this.downloadRepo.getById(download.id);
          if (existing) {
            existing.updateProgress(item.getReceivedBytes());
            this.broadcastDownloads();
            this.eventBus.emit(EventTypes.DOWNLOAD_PROGRESS, {
              id: download.id,
              receivedBytes: existing.receivedBytes,
            });
          }
        }
      });

      item.once('done', ({ state }) => {
        const existing = this.downloadRepo.getById(download.id);
        if (existing) {
          if (state === 'completed') {
            existing.complete();
            this.eventBus.emit(EventTypes.DOWNLOAD_COMPLETED, existing.toJSON());
          } else if (state === 'cancelled') {
            existing.cancel();
            this.eventBus.emit(EventTypes.DOWNLOAD_CANCELLED, { id: download.id });
          } else {
            existing.interrupt();
          }
          this.broadcastDownloads();
        }
      });
    });
  }

  private broadcastDownloads() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      this.broadcast({
        downloads: this.downloadRepo.getAll().map(d => d.toJSON()),
      });
    }, 100);
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'DOWNLOAD_CANCEL': {
        const id = action.payload?.id;
        if (!id) return;
        const download = this.downloadRepo.getById(id);
        if (download && download.isActive()) {
          download.cancel();
          this.broadcastDownloads();
          this.eventBus.emit(EventTypes.DOWNLOAD_CANCELLED, { id });
        }
        break;
      }
      case 'DOWNLOAD_OPEN': {
        const id = action.payload?.id;
        if (!id) return;
        const download = this.downloadRepo.getById(id);
        if (download && download.state === 'completed') {
          // Block executable file types
          const dangerousExts = [
            '.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.js', '.mjs',
            '.vbs', '.wsf', '.hta', '.cpl', '.msc', '.reg', '.inf',
            '.lnk', '.url', '.com', '.scr', '.pif', '.dll', '.jar',
          ];
          const ext = path.extname(download.filename).toLowerCase();
          if (dangerousExts.includes(ext)) {
            this.logger.warn(`Blocked opening executable file: ${download.filename}`);
            return;
          }
          shell.openPath(download.path).catch((err) => {
            this.errorHandler.handle(
              'DOWNLOAD_OPEN_FAILED',
              String(err),
              ErrorSeverity.LOW,
              'DownloadService'
            );
          });
        }
        break;
      }
      case 'DOWNLOAD_SHOW_IN_FOLDER': {
        const id = action.payload?.id;
        if (!id) return;
        const download = this.downloadRepo.getById(id);
        if (download) {
          shell.showItemInFolder(download.path);
        }
        break;
      }
    }
  }
}
