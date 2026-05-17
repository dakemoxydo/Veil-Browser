import { randomUUID } from 'crypto';
export class Tab {
    id;
    url;
    title;
    isLoading;
    canGoBack;
    canGoForward;
    favicon;
    loadProgress;
    constructor(props) {
        this.id = props.id;
        this.url = props.url;
        this.title = props.title;
        this.isLoading = props.isLoading;
        this.canGoBack = props.canGoBack;
        this.canGoForward = props.canGoForward;
        this.favicon = props.favicon;
        this.loadProgress = props.loadProgress;
    }
    static create(url) {
        return new Tab({
            id: randomUUID(),
            url,
            title: url,
            isLoading: true,
            canGoBack: false,
            canGoForward: false,
            loadProgress: 0,
        });
    }
    static fromJSON(props) {
        return new Tab(props);
    }
    navigate(url) {
        this.url = url;
        this.isLoading = true;
        this.loadProgress = 0;
    }
    startLoading() {
        this.isLoading = true;
        this.loadProgress = 0;
    }
    stopLoading() {
        this.isLoading = false;
        this.loadProgress = 100;
    }
    updateTitle(title) {
        this.title = title;
    }
    updateFavicon(favicon) {
        this.favicon = favicon;
    }
    updateNavigationState(canGoBack, canGoForward) {
        this.canGoBack = canGoBack;
        this.canGoForward = canGoForward;
    }
    updateProgress(progress) {
        this.loadProgress = Math.max(0, Math.min(100, progress));
    }
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            isLoading: this.isLoading,
            canGoBack: this.canGoBack,
            canGoForward: this.canGoForward,
            favicon: this.favicon,
            loadProgress: this.loadProgress,
        };
    }
}
