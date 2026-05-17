import { HistoryEntry as HistoryEntryInterface } from '../index';
export declare class HistoryEntry {
    readonly id: string;
    url: string;
    title: string;
    favicon?: string;
    timestamp: number;
    private constructor();
    static create(url: string, title: string): HistoryEntry;
    static fromJSON(props: HistoryEntryInterface): HistoryEntry;
    updateTitle(title: string): void;
    refresh(): void;
    toJSON(): HistoryEntryInterface;
}
