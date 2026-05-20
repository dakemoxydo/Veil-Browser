import { TabInfo } from '../index';
import { randomUUID } from 'crypto';

export class Tab {
  public readonly id: string;
  public url: string;
  public title: string;
  public isLoading: boolean;
  public canGoBack: boolean;
  public canGoForward: boolean;
  public favicon?: string;
  public loadProgress: number;
  public isPlayingAudio: boolean;
  public muted: boolean;
  public groupId?: string;

  private constructor(props: TabInfo) {
    this.id = props.id;
    this.url = props.url;
    this.title = props.title;
    this.isLoading = props.isLoading;
    this.canGoBack = props.canGoBack;
    this.canGoForward = props.canGoForward;
    this.favicon = props.favicon;
    this.loadProgress = props.loadProgress;
    this.isPlayingAudio = props.isPlayingAudio ?? false;
    this.muted = props.muted ?? false;
    this.groupId = props.groupId;
  }

  static create(url: string): Tab {
    return new Tab({
      id: randomUUID(),
      url,
      title: url,
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      loadProgress: 0,
      isPlayingAudio: false,
      muted: false,
    });
  }

  static fromJSON(props: TabInfo): Tab {
    return new Tab(props);
  }

  navigate(url: string): void {
    this.url = url;
    this.isLoading = true;
    this.loadProgress = 0;
  }

  startLoading(): void {
    this.isLoading = true;
    this.loadProgress = 0;
  }

  stopLoading(): void {
    this.isLoading = false;
    this.loadProgress = 100;
  }

  updateTitle(title: string): void {
    this.title = title;
  }

  updateFavicon(favicon: string): void {
    this.favicon = favicon;
  }

  updateNavigationState(canGoBack: boolean, canGoForward: boolean): void {
    this.canGoBack = canGoBack;
    this.canGoForward = canGoForward;
  }

  updateProgress(progress: number): void {
    this.loadProgress = Math.max(0, Math.min(100, progress));
  }

  setAudioState(isPlaying: boolean): void {
    this.isPlayingAudio = isPlaying;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setGroupId(groupId: string | undefined): void {
    this.groupId = groupId;
  }

  toJSON(): TabInfo {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      isLoading: this.isLoading,
      canGoBack: this.canGoBack,
      canGoForward: this.canGoForward,
      favicon: this.favicon,
      loadProgress: this.loadProgress,
      isPlayingAudio: this.isPlayingAudio,
      muted: this.muted,
      groupId: this.groupId,
    };
  }
}
