import { app, shell, session, DownloadItem as ElectronDownloadItem, Event as ElectronEvent } from 'electron';
import { VeilService } from '../../core/ServiceRegistry';
import { VeilAction, DownloadItem } from '@veil/shared';
import { EventBus, EventTypes } from '../../core/EventBus';
import { Logger } from '../../core/Logger';
import { ErrorHandler, ErrorSeverity } from '../../core/ErrorHandler';
import { StateBroadcaster } from '../../core/StateBroadcaster';
import { randomUUID } from 'crypto';

export class NewDownloadService implements VeilService {
  public name = 'DownloadService';
  private downloads: DownloadItem[] = [];
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  private stateBroadcaster: StateBroadcaster;

  constructor() {
    this.logger = new Logger('DownloadService');
    this.errorHandler = ErrorHandler.getInstance();
    this.eventBus = EventBus.getInstance();
    this.stateBroadcaster = StateBroadcaster.getInstance();
  }

  public async init() {
    this.logger.info('DownloadService initialized');
    this.setupDownloadListener();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(EventTypes.DOWNLOAD_STARTED, (data: DownloadItem) => {
      this.logger.debug(`Download started: ${data.filename}`);
    });

    this.eventBus.on(EventTypes.DOWNLOAD_COMPLETED, (data: DownloadItem) => {
      this.logger.info(`Download completed: ${data.filename}`);
    });
  }

  private setupDownloadListener() {
    const defaultSession = session.defaultSession;
    defaultSession.on('will-download', (_event: ElectronEvent, item: ElectronDownloadItem) => {
      const downloadId = randomUUID();
      const downloadPath = app.getPath('downloads');

      const download: DownloadItem = {
        id: downloadId,
        filename: item.getFilename(),
        url: item.getURL(),
        path: downloadPath,
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing',
        startTime: Date.now(),
      };

      this.downloads.push(download);
      this.broadcast();
      this.eventBus.emit(EventTypes.DOWNLOAD_STARTED, download);

      item.setSavePath(`${downloadPath}/${item.getFilename()}`);

      item.on('updated', (_event: ElectronEvent, state: string) => {
        if (state === 'progressing') {
          const existing = this.downloads.find(d => d.id === downloadId);
          if (existing) {
            existing.receivedBytes = item.getReceivedBytes();
            this.broadcast();
            this.eventBus.emit(EventTypes.DOWNLOAD_PROGRESS, {
              id: downloadId,
              receivedBytes: existing.receivedBytes,
            });
          }
        }
      });

      item.once('done', (_event: ElectronEvent, state: string) => {
        const existing = this.downloads.find(d => d.id === downloadId);
        if (existing) {
          if (state === 'completed') {
            existing.state = 'completed';
            this.eventBus.emit(EventTypes.DOWNLOAD_COMPLETED, existing);
          } else if (state === 'cancelled') {
            existing.state = 'cancelled';
            this.eventBus.emit(EventTypes.DOWNLOAD_CANCELLED, { id: downloadId });
          } else {
            existing.state = 'interrupted';
          }
          this.broadcast();
        }
      });
    });
  }

  private broadcast() {
    this.stateBroadcaster.patch({ downloads: this.downloads });
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'DOWNLOAD_CANCEL': {
        const download = this.downloads.find(d => d.id === action.payload.id);
        if (download && download.state === 'progressing') {
          download.state = 'cancelled';
          this.broadcast();
          this.eventBus.emit(EventTypes.DOWNLOAD_CANCELLED, { id: download.id });
        }
        break;
      }
      case 'DOWNLOAD_OPEN': {
        const download = this.downloads.find(d => d.id === action.payload.id);
        if (download && download.state === 'completed') {
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
        const download = this.downloads.find(d => d.id === action.payload.id);
        if (download) {
          shell.showItemInFolder(download.path);
        }
        break;
      }
    }
  }
}
