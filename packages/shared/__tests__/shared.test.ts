import { describe, it, expect } from 'vitest';
import { getSearchUrl, DEFAULT_SETTINGS } from '../index';

describe('getSearchUrl', () => {
  it('returns DuckDuckGo URL for duckduckgo engine', () => {
    const url = getSearchUrl('test query', 'duckduckgo');
    expect(url).toBe('https://duckduckgo.com/?q=test%20query');
  });

  it('returns Google URL for google engine', () => {
    const url = getSearchUrl('test', 'google');
    expect(url).toBe('https://www.google.com/search?q=test');
  });

  it('returns Brave URL for brave engine', () => {
    const url = getSearchUrl('test', 'brave');
    expect(url).toBe('https://search.brave.com/search?q=test');
  });

  it('returns custom URL for custom engine', () => {
    const url = getSearchUrl('test', 'custom', 'https://example.com/search?q=');
    expect(url).toBe('https://example.com/search?q=test');
  });

  it('falls back to DuckDuckGo for custom without URL', () => {
    const url = getSearchUrl('test', 'custom');
    expect(url).toContain('duckduckgo.com');
  });

  it('encodes special characters', () => {
    const url = getSearchUrl('hello world & more', 'duckduckgo');
    expect(url).toContain('hello%20world%20%26%20more');
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('has all required general fields', () => {
    expect(DEFAULT_SETTINGS.general).toBeDefined();
    expect(DEFAULT_SETTINGS.general.homepage).toBeTruthy();
    expect(DEFAULT_SETTINGS.general.searchEngine).toBeTruthy();
    expect(typeof DEFAULT_SETTINGS.general.restoreTabsOnLaunch).toBe('boolean');
  });

  it('has all required privacy fields', () => {
    expect(DEFAULT_SETTINGS.privacy).toBeDefined();
    expect(typeof DEFAULT_SETTINGS.privacy.adblockEnabled).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.privacy.blockTrackers).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.privacy.doNotTrack).toBe('boolean');
  });

  it('has all required appearance fields', () => {
    expect(DEFAULT_SETTINGS.appearance).toBeDefined();
    expect(typeof DEFAULT_SETTINGS.appearance.showBookmarksBar).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.appearance.showSidebar).toBe('boolean');
  });
});
