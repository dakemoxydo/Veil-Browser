export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface DomainEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

import { IEventBus } from './interfaces';

export class EventBus implements IEventBus {
  private static instance: EventBus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize = 1000;

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  public off<T>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public async emit<T>(eventType: string, data: T): Promise<void> {
    const event: DomainEvent = {
      type: eventType,
      payload: data,
      timestamp: Date.now(),
    };

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Get handlers
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Execute all handlers
    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventType}:`, error);
      }
    }

    // Wait for all async handlers
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  public once<T>(eventType: string, handler: EventHandler<T>): () => void {
    const wrappedHandler = (data: T) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };
    return this.on(eventType, wrappedHandler);
  }

  public getEventHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }

  public reset(): void {
    this.handlers.clear();
    this.eventHistory = [];
  }
}

// Event type constants
export const EventTypes = {
  // Tab events
  TAB_CREATED: 'tab:created',
  TAB_CLOSED: 'tab:closed',
  TAB_FOCUSED: 'tab:focused',
  TAB_NAVIGATED: 'tab:navigated',
  TAB_TITLE_CHANGED: 'tab:title-changed',
  TAB_LOADING: 'tab:loading',

  // Navigation events
  NAVIGATION_BACK: 'navigation:back',
  NAVIGATION_FORWARD: 'navigation:forward',
  NAVIGATION_RELOAD: 'navigation:reload',
  NAVIGATION_HOME: 'navigation:home',

  // Bookmark events
  BOOKMARK_ADDED: 'bookmark:added',
  BOOKMARK_REMOVED: 'bookmark:removed',

  // Download events
  DOWNLOAD_STARTED: 'download:started',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_CANCELLED: 'download:cancelled',

  // Settings events
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_LOADED: 'settings:loaded',
  SETTINGS_SAVED: 'settings:saved',

  // Window events
  WINDOW_MINIMIZED: 'window:minimized',
  WINDOW_MAXIMIZED: 'window:maximized',
  WINDOW_CLOSED: 'window:closed',
  WINDOW_FOCUSED: 'window:focused',

  // Debug events
  DEBUG_LOG: 'debug:log',
  DEBUG_ERROR: 'debug:error',

  // State events
  STATE_CHANGED: 'state:changed',
  STATE_PATCHED: 'state:patched',
} as const;
