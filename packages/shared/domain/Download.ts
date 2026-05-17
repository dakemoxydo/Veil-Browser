import { DownloadItem } from '../index';
import { randomUUID } from 'crypto';

export class Download {
  public readonly id: string;
  public filename: string;
  public url: string;
  public path: string;
  public totalBytes: number;
  public receivedBytes: number;
  public state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  public readonly startTime: number;

  private constructor(props: DownloadItem) {
    this.id = props.id;
    this.filename = props.filename;
    this.url = props.url;
    this.path = props.path;
    this.totalBytes = props.totalBytes;
    this.receivedBytes = props.receivedBytes;
    this.state = props.state;
    this.startTime = props.startTime;
  }

  static create(filename: string, url: string, downloadPath: string, totalBytes: number): Download {
    return new Download({
      id: randomUUID(),
      filename,
      url,
      path: downloadPath,
      totalBytes,
      receivedBytes: 0,
      state: 'progressing',
      startTime: Date.now(),
    });
  }

  static fromJSON(props: DownloadItem): Download {
    return new Download(props);
  }

  updateProgress(receivedBytes: number): void {
    this.receivedBytes = receivedBytes;
  }

  complete(): void {
    this.state = 'completed';
    this.receivedBytes = this.totalBytes;
  }

  cancel(): void {
    this.state = 'cancelled';
  }

  interrupt(): void {
    this.state = 'interrupted';
  }

  isActive(): boolean {
    return this.state === 'progressing';
  }

  getProgress(): number {
    if (this.totalBytes === 0) return 0;
    return Math.round((this.receivedBytes / this.totalBytes) * 100);
  }

  toJSON(): DownloadItem {
    return {
      id: this.id,
      filename: this.filename,
      url: this.url,
      path: this.path,
      totalBytes: this.totalBytes,
      receivedBytes: this.receivedBytes,
      state: this.state,
      startTime: this.startTime,
    };
  }
}
