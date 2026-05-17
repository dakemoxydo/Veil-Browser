import { DownloadItem } from '../index';
export declare class Download {
    readonly id: string;
    filename: string;
    url: string;
    path: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
    readonly startTime: number;
    private constructor();
    static create(filename: string, url: string, downloadPath: string, totalBytes: number): Download;
    static fromJSON(props: DownloadItem): Download;
    updateProgress(receivedBytes: number): void;
    complete(): void;
    cancel(): void;
    interrupt(): void;
    isActive(): boolean;
    getProgress(): number;
    toJSON(): DownloadItem;
}
