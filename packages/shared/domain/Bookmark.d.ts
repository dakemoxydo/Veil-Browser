import { BookmarkItem } from '../index';
export declare class Bookmark {
    readonly id: string;
    url: string;
    title: string;
    favicon?: string;
    readonly dateAdded: number;
    folder?: string;
    private constructor();
    static create(url: string, title: string, folder?: string, favicon?: string): Bookmark;
    static fromJSON(props: BookmarkItem): Bookmark;
    matchesUrl(url: string): boolean;
    updateTitle(title: string): void;
    updateFavicon(favicon: string): void;
    toJSON(): BookmarkItem;
}
