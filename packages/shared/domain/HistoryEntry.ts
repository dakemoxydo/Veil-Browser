import { randomUUID } from 'crypto';

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export class HistoryEntryModel {
  public readonly id: string;
  public url: string;
  public title: string;
  public favicon?: string;
  public timestamp: number;

  private constructor(props: HistoryEntry) {
    this.id = props.id;
    this.url = props.url;
    this.title = props.title;
    this.favicon = props.favicon;
    this.timestamp = props.timestamp;
  }

  static create(url: string, title: string): HistoryEntryModel {
    return new HistoryEntryModel({
      id: randomUUID(),
      url,
      title,
      timestamp: Date.now(),
    });
  }

  static fromJSON(props: HistoryEntry): HistoryEntryModel {
    return new HistoryEntryModel(props);
  }

  updateTitle(title: string): void {
    this.title = title;
  }

  refresh(): void {
    this.timestamp = Date.now();
  }

  toJSON(): HistoryEntry {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      favicon: this.favicon,
      timestamp: this.timestamp,
    };
  }
}
