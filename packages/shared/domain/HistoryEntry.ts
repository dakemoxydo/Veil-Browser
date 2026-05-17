import { HistoryEntry as HistoryEntryData } from '../index';
import { randomUUID } from 'crypto';

export class HistoryEntryModel {
  public readonly id: string;
  public url: string;
  public title: string;
  public favicon?: string;
  public timestamp: number;

  private constructor(props: HistoryEntryData) {
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

  static fromJSON(props: HistoryEntryData): HistoryEntryModel {
    return new HistoryEntryModel(props);
  }

  updateTitle(title: string): void {
    this.title = title;
  }

  refresh(): void {
    this.timestamp = Date.now();
  }

  toJSON(): HistoryEntryData {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      favicon: this.favicon,
      timestamp: this.timestamp,
    };
  }
}
