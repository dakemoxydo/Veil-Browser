import { BookmarkItem } from '../index';
import { randomUUID } from 'crypto';

export class Bookmark {
  public readonly id: string;
  public url: string;
  public title: string;
  public favicon?: string;
  public readonly dateAdded: number;
  public folder?: string;

  private constructor(props: BookmarkItem) {
    this.id = props.id;
    this.url = props.url;
    this.title = props.title;
    this.favicon = props.favicon;
    this.dateAdded = props.dateAdded;
    this.folder = props.folder;
  }

  static create(url: string, title: string, folder?: string, favicon?: string): Bookmark {
    return new Bookmark({
      id: randomUUID(),
      url,
      title,
      favicon,
      dateAdded: Date.now(),
      folder,
    });
  }

  static fromJSON(props: BookmarkItem): Bookmark {
    return new Bookmark(props);
  }

  matchesUrl(url: string): boolean {
    // Normalize trailing slashes and host case for comparison
    const normalize = (u: string) => {
      try {
        const parsed = new URL(u);
        return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}${parsed.hash}`;
      } catch {
        return u.replace(/\/+$/, '');
      }
    };
    return normalize(this.url) === normalize(url);
  }

  updateTitle(title: string): void {
    this.title = title;
  }

  updateFavicon(favicon: string): void {
    this.favicon = favicon;
  }

  toJSON(): BookmarkItem {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      favicon: this.favicon,
      dateAdded: this.dateAdded,
      folder: this.folder,
    };
  }
}
