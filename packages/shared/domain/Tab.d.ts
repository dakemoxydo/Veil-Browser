import { TabInfo } from '../index';
export declare class Tab {
    readonly id: string;
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    favicon?: string;
    loadProgress: number;
    private constructor();
    static create(url: string): Tab;
    static fromJSON(props: TabInfo): Tab;
    navigate(url: string): void;
    startLoading(): void;
    stopLoading(): void;
    updateTitle(title: string): void;
    updateFavicon(favicon: string): void;
    updateNavigationState(canGoBack: boolean, canGoForward: boolean): void;
    updateProgress(progress: number): void;
    toJSON(): TabInfo;
}
