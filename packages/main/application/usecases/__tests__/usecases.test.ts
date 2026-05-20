import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tab, Bookmark, DEFAULT_SETTINGS } from '@veil/shared';
import { CreateTabUseCase } from '../CreateTabUseCase';
import { CloseTabUseCase } from '../CloseTabUseCase';
import { FocusTabUseCase } from '../FocusTabUseCase';
import { NavigateTabUseCase } from '../NavigateTabUseCase';
import { AddBookmarkUseCase } from '../AddBookmarkUseCase';
import { RemoveBookmarkUseCase } from '../RemoveBookmarkUseCase';
import { UpdateSettingsUseCase } from '../UpdateSettingsUseCase';
import type { ITabRepository } from '../../../core/repositories/ITabRepository';
import type { ITabViewProvider } from '../../../core/ports/ITabViewProvider';
import type { IBookmarkRepository } from '../../../core/repositories/IBookmarkRepository';
import type { ISettingsRepository } from '../../../core/repositories/ISettingsRepository';
import type { VeilSettings } from '@veil/shared';

// --- Mock factories ---

function createMockTabRepo(initialTabs: Tab[] = []): ITabRepository {
  let tabs = [...initialTabs];
  let activeTabId: string | null = initialTabs.length > 0 ? initialTabs[0].id : null;
  return {
    getAll: () => tabs,
    getById: (id: string) => tabs.find(t => t.id === id),
    add: (tab: Tab) => { tabs.push(tab); },
    remove: (id: string) => { tabs = tabs.filter(t => t.id !== id); },
    reorder: (_from: number, _to: number) => {},
    getActiveTabId: () => activeTabId,
    setActiveTabId: (id: string | null) => { activeTabId = id; },
    restoreTabs: () => ({ tabs: [], activeTabId: null }),
    saveTabs: () => {},
  };
}

function createMockViewProvider(): ITabViewProvider {
  return {
    createView: vi.fn(),
    materializeView: vi.fn(() => true),
    focusView: vi.fn(),
    closeView: vi.fn(),
    hideAllViews: vi.fn(),
    showAllViews: vi.fn(),
    setShellOffset: vi.fn(),
    cleanup: vi.fn(),
    navigateView: vi.fn(),
    goBack: vi.fn(() => false),
    goForward: vi.fn(() => false),
    reloadView: vi.fn(),
    canGoBack: () => false,
    canGoForward: () => false,
    registerViewListeners: vi.fn(),
  };
}

function createMockBookmarkRepo(initial: Bookmark[] = []): IBookmarkRepository {
  let bookmarks = [...initial];
  return {
    getAll: () => bookmarks,
    getById: (id: string) => bookmarks.find(b => b.id === id),
    getByUrl: (url: string) => bookmarks.find(b => b.matchesUrl(url)),
    add: (b: Bookmark) => { bookmarks.push(b); },
    remove: (id: string) => { bookmarks = bookmarks.filter(b => b.id !== id); },
    isBookmarked: (url: string) => bookmarks.some(b => b.matchesUrl(url)),
    search: (q: string) => bookmarks.filter(b => b.title.includes(q) || b.url.includes(q)),
  };
}

function createMockSettingsRepo(overrides: Partial<VeilSettings> = {}): ISettingsRepository {
  let settings: VeilSettings = {
    general: { ...DEFAULT_SETTINGS.general },
    privacy: { ...DEFAULT_SETTINGS.privacy },
    appearance: { ...DEFAULT_SETTINGS.appearance },
    ...overrides,
  };
  return {
    get: () => settings,
    update: (partial: Partial<VeilSettings>) => {
      settings = {
        ...settings,
        ...partial,
        general: { ...settings.general, ...(partial.general || {}) },
        privacy: { ...settings.privacy, ...(partial.privacy || {}) },
        appearance: { ...settings.appearance, ...(partial.appearance || {}) },
      };
    },
  };
}

// --- Tests ---

describe('CreateTabUseCase', () => {
  it('should create a tab, add to repo, set active, and create view', () => {
    const tabRepo = createMockTabRepo();
    const viewProvider = createMockViewProvider();
    const uc = new CreateTabUseCase(tabRepo, viewProvider);

    const tab = uc.execute('https://example.com');

    expect(tab.url).toBe('https://example.com');
    expect(tabRepo.getAll()).toHaveLength(1);
    expect(tabRepo.getActiveTabId()).toBe(tab.id);
    expect(viewProvider.hideAllViews).toHaveBeenCalled();
    expect(viewProvider.createView).toHaveBeenCalledWith(tab.id, 'https://example.com');
  });

  it('should create multiple tabs independently', () => {
    const tabRepo = createMockTabRepo();
    const viewProvider = createMockViewProvider();
    const uc = new CreateTabUseCase(tabRepo, viewProvider);

    uc.execute('https://a.com');
    uc.execute('https://b.com');

    expect(tabRepo.getAll()).toHaveLength(2);
    expect(viewProvider.createView).toHaveBeenCalledTimes(2);
  });
});

describe('CloseTabUseCase', () => {
  it('should close tab and transfer focus to previous tab', () => {
    const tabA = Tab.create('https://a.com');
    const tabB = Tab.create('https://b.com');
    const tabC = Tab.create('https://c.com');
    const tabRepo = createMockTabRepo([tabA, tabB, tabC]);
    tabRepo.setActiveTabId(tabC.id);
    const viewProvider = createMockViewProvider();
    const uc = new CloseTabUseCase(tabRepo, viewProvider);

    const newActive = uc.execute(tabC.id);

    expect(tabRepo.getAll()).toHaveLength(2);
    expect(viewProvider.closeView).toHaveBeenCalledWith(tabC.id);
    expect(newActive).toBe(tabB.id);
    expect(tabRepo.getActiveTabId()).toBe(tabB.id);
    expect(viewProvider.focusView).toHaveBeenCalledWith(tabB.id);
  });

  it('should return null when closing the last tab', () => {
    const tab = Tab.create('https://only.com');
    const tabRepo = createMockTabRepo([tab]);
    const viewProvider = createMockViewProvider();
    const uc = new CloseTabUseCase(tabRepo, viewProvider);

    const newActive = uc.execute(tab.id);

    expect(newActive).toBeNull();
    expect(tabRepo.getActiveTabId()).toBeNull();
  });

  it('should return null for non-existent tab', () => {
    const tabRepo = createMockTabRepo();
    const viewProvider = createMockViewProvider();
    const uc = new CloseTabUseCase(tabRepo, viewProvider);

    const result = uc.execute('nonexistent');

    expect(result).toBeNull();
    expect(viewProvider.closeView).not.toHaveBeenCalled();
  });

  it('should not transfer focus when closing non-active tab', () => {
    const tabA = Tab.create('https://a.com');
    const tabB = Tab.create('https://b.com');
    const tabRepo = createMockTabRepo([tabA, tabB]);
    tabRepo.setActiveTabId(tabA.id);
    const viewProvider = createMockViewProvider();
    const uc = new CloseTabUseCase(tabRepo, viewProvider);

    const newActive = uc.execute(tabB.id);

    expect(newActive).toBeNull();
    expect(tabRepo.getActiveTabId()).toBe(tabA.id);
  });
});

describe('FocusTabUseCase', () => {
  it('should focus tab and hide others', () => {
    const tabA = Tab.create('https://a.com');
    const tabB = Tab.create('https://b.com');
    const tabRepo = createMockTabRepo([tabA, tabB]);
    const viewProvider = createMockViewProvider();
    const uc = new FocusTabUseCase(tabRepo, viewProvider);

    const result = uc.execute(tabB.id);

    expect(result).toBe(true);
    expect(tabRepo.getActiveTabId()).toBe(tabB.id);
    expect(viewProvider.hideAllViews).toHaveBeenCalled();
    expect(viewProvider.focusView).toHaveBeenCalledWith(tabB.id);
  });

  it('should return false for non-existent tab', () => {
    const tabRepo = createMockTabRepo();
    const viewProvider = createMockViewProvider();
    const uc = new FocusTabUseCase(tabRepo, viewProvider);

    expect(uc.execute('nonexistent')).toBe(false);
  });
});

describe('NavigateTabUseCase', () => {
  it('should navigate tab to URL', () => {
    const tab = Tab.create('https://old.com');
    const tabRepo = createMockTabRepo([tab]);
    const viewProvider = createMockViewProvider();
    const uc = new NavigateTabUseCase(tabRepo, viewProvider);

    const result = uc.execute(tab.id, 'https://new.com');

    expect(result).toBe(true);
    expect(tab.url).toBe('https://new.com');
    expect(viewProvider.navigateView).toHaveBeenCalledWith(tab.id, 'https://new.com');
  });

  it('should return false for non-existent tab', () => {
    const tabRepo = createMockTabRepo();
    const viewProvider = createMockViewProvider();
    const uc = new NavigateTabUseCase(tabRepo, viewProvider);

    expect(uc.execute('nonexistent', 'https://x.com')).toBe(false);
  });
});

describe('AddBookmarkUseCase', () => {
  it('should create a new bookmark', () => {
    const bookmarkRepo = createMockBookmarkRepo();
    const uc = new AddBookmarkUseCase(bookmarkRepo);

    const bookmark = uc.execute('https://example.com', 'Example');

    expect(bookmark.url).toBe('https://example.com');
    expect(bookmark.title).toBe('Example');
    expect(bookmarkRepo.getAll()).toHaveLength(1);
  });

  it('should return existing bookmark for duplicate URL (idempotent)', () => {
    const existing = Bookmark.create('https://existing.com', 'Old');
    const bookmarkRepo = createMockBookmarkRepo([existing]);
    const uc = new AddBookmarkUseCase(bookmarkRepo);

    const result = uc.execute('https://existing.com', 'New Title');

    expect(result.id).toBe(existing.id);
    expect(bookmarkRepo.getAll()).toHaveLength(1);
  });

  it('should add bookmark with folder', () => {
    const bookmarkRepo = createMockBookmarkRepo();
    const uc = new AddBookmarkUseCase(bookmarkRepo);

    const bookmark = uc.execute('https://work.com', 'Work', 'Work');

    expect(bookmark.folder).toBe('Work');
  });
});

describe('RemoveBookmarkUseCase', () => {
  it('should remove existing bookmark', () => {
    const bookmark = Bookmark.create('https://remove.com', 'Remove');
    const bookmarkRepo = createMockBookmarkRepo([bookmark]);
    const uc = new RemoveBookmarkUseCase(bookmarkRepo);

    const result = uc.execute(bookmark.id);

    expect(result).toBe(true);
    expect(bookmarkRepo.getAll()).toHaveLength(0);
  });

  it('should return false for non-existent bookmark', () => {
    const bookmarkRepo = createMockBookmarkRepo();
    const uc = new RemoveBookmarkUseCase(bookmarkRepo);

    expect(uc.execute('nonexistent')).toBe(false);
  });
});

describe('UpdateSettingsUseCase', () => {
  it('should update settings and return merged result', () => {
    const settingsRepo = createMockSettingsRepo();
    const uc = new UpdateSettingsUseCase(settingsRepo);

    const result = uc.execute({ privacy: { ...DEFAULT_SETTINGS.privacy, adblockEnabled: false } });

    expect(result.privacy.adblockEnabled).toBe(false);
    expect(result.privacy.blockTrackers).toBe(DEFAULT_SETTINGS.privacy.blockTrackers);
    expect(settingsRepo.get().privacy.adblockEnabled).toBe(false);
  });

  it('should deep merge without overwriting unrelated settings', () => {
    const settingsRepo = createMockSettingsRepo();
    const uc = new UpdateSettingsUseCase(settingsRepo);

    uc.execute({ general: { ...DEFAULT_SETTINGS.general, homepage: 'https://custom.com' } });

    const settings = settingsRepo.get();
    expect(settings.general.homepage).toBe('https://custom.com');
    expect(settings.general.searchEngine).toBe(DEFAULT_SETTINGS.general.searchEngine);
  });
});
