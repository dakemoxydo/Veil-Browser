import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateBroadcaster } from '../StateBroadcaster';
import { DEFAULT_SETTINGS } from '@veil/shared';

describe('StateBroadcaster', () => {
  let broadcaster: StateBroadcaster;

  beforeEach(() => {
    (StateBroadcaster as any).instance = undefined;
    broadcaster = StateBroadcaster.getInstance();
  });

  it('returns the same singleton instance', () => {
    const a = StateBroadcaster.getInstance();
    const b = StateBroadcaster.getInstance();
    expect(a).toBe(b);
  });

  it('getState returns initial state', () => {
    const state = broadcaster.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('patch merges top-level fields', () => {
    broadcaster.patch({ activeTabId: 'tab-1' });
    expect(broadcaster.getState().activeTabId).toBe('tab-1');
  });

  it('patch deep merges privacyStats', () => {
    broadcaster.patch({ privacyStats: { blockedTotal: 10, blockedCurrent: 0 } });
    broadcaster.patch({ privacyStats: { blockedTotal: 10, blockedCurrent: 5 } });
    const stats = broadcaster.getState().privacyStats;
    expect(stats.blockedTotal).toBe(10);
    expect(stats.blockedCurrent).toBe(5);
  });

  it('patch deep merges settings', () => {
    broadcaster.patch({ settings: { privacy: { adblockEnabled: false } } as any });
    const settings = broadcaster.getState().settings;
    expect(settings.privacy.adblockEnabled).toBe(false);
    expect(settings.privacy.blockTrackers).toBe(true); // preserved
    expect(settings.general.homepage).toBe(DEFAULT_SETTINGS.general.homepage); // preserved
  });

  it('patch sends full state to webContents', () => {
    const mockSend = vi.fn();
    const mockWebContents = { send: mockSend, isDestroyed: () => false } as any;
    broadcaster.setWebContents(mockWebContents);

    broadcaster.patch({ activeTabId: 'tab-1' });
    expect(mockSend).toHaveBeenCalledWith('veil:state-patch', expect.objectContaining({
      activeTabId: 'tab-1',
    }));
  });

  it('patch does not send to destroyed webContents', () => {
    const mockSend = vi.fn();
    const mockWebContents = { send: mockSend, isDestroyed: () => true } as any;
    broadcaster.setWebContents(mockWebContents);

    broadcaster.patch({ activeTabId: 'tab-1' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
