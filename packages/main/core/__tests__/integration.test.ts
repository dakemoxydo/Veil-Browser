/**
 * Integration tests for the core service wiring.
 * Tests the interaction between EventBus, StateBroadcaster, ActionValidator, and RateLimiter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, EventTypes } from '../EventBus';
import { ErrorHandler, ErrorSeverity } from '../ErrorHandler';
import { StateBroadcaster } from '../StateBroadcaster';
import { ActionValidator } from '../ActionValidator';
import { RateLimiter } from '../RateLimiter';
import { Logger } from '../Logger';

describe('Core Integration', () => {
  let eventBus: EventBus;
  let errorHandler: ErrorHandler;
  let stateBroadcaster: StateBroadcaster;
  let validator: ActionValidator;
  let rateLimiter: RateLimiter;
  let logger: Logger;

  beforeEach(() => {
    eventBus = new EventBus();
    errorHandler = new ErrorHandler(eventBus);
    stateBroadcaster = new StateBroadcaster(errorHandler);
    validator = new ActionValidator();
    rateLimiter = new RateLimiter(100);
    logger = new Logger('Test', eventBus);
  });

  describe('EventBus + ErrorHandler', () => {
    it('error handler emits DEBUG_ERROR event on bus', async () => {
      const handler = vi.fn();
      eventBus.on(EventTypes.DEBUG_ERROR, handler);

      errorHandler.handle('TEST_ERROR', 'Something went wrong', ErrorSeverity.LOW, 'Test');

      // Wait for async emit
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TEST_ERROR',
          message: 'Something went wrong',
        })
      );
    });

    it('error handler stores errors', () => {
      errorHandler.handle('ERR1', 'Error 1', ErrorSeverity.LOW, 'Source1');
      errorHandler.handle('ERR2', 'Error 2', ErrorSeverity.MEDIUM, 'TestSource');

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].code).toBe('ERR1');
      expect(errors[1].source).toBe('TestSource');
    });

    it('handleAsync catches and logs errors', async () => {
      const result = await errorHandler.handleAsync(
        'ASYNC_ERR',
        () => Promise.reject(new Error('async fail')),
        'TestSource'
      );
      expect(result).toBeNull();
      expect(errorHandler.getErrors()).toHaveLength(1);
      expect(errorHandler.getErrors()[0].code).toBe('ASYNC_ERR');
    });
  });

  describe('StateBroadcaster', () => {
    it('patch merges settings deeply', () => {
      const mockWebContents = { send: vi.fn(), isDestroyed: () => false };
      stateBroadcaster.setWebContents(mockWebContents as never);

      stateBroadcaster.patch({
        settings: {
          general: { homepage: 'https://test.com' },
        },
      } as never);

      const state = stateBroadcaster.getState();
      expect(state.settings.general.homepage).toBe('https://test.com');
      // Other settings should be preserved
      expect(state.settings.privacy).toBeDefined();
    });

    it('patch merges privacyStats', () => {
      stateBroadcaster.patch({
        privacyStats: { blockedCurrent: 5 },
      } as never);

      const state = stateBroadcaster.getState();
      expect(state.privacyStats.blockedCurrent).toBe(5);
      expect(state.privacyStats.blockedTotal).toBe(0);
    });

    it('broadcast sends state to webContents', () => {
      const mockWebContents = { send: vi.fn(), isDestroyed: () => false };
      stateBroadcaster.setWebContents(mockWebContents as never);

      stateBroadcaster.patch({ activeTabId: 'tab-1' } as never);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'veil:state-patch',
        expect.objectContaining({ activeTabId: 'tab-1' })
      );
    });

    it('does not broadcast to destroyed webContents', () => {
      const mockWebContents = { send: vi.fn(), isDestroyed: () => true };
      stateBroadcaster.setWebContents(mockWebContents as never);

      stateBroadcaster.patch({ activeTabId: 'tab-1' } as never);

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('ActionValidator', () => {
    it('validates correct actions', () => {
      expect(validator.isValid({ type: 'TAB_NEW', payload: {} })).toBe(true);
      expect(validator.isValid({ type: 'TAB_CLOSE', payload: { id: 'abc' } })).toBe(true);
      expect(validator.isValid({ type: 'SETTINGS_UPDATE', payload: { general: {} } })).toBe(true);
    });

    it('rejects invalid actions', () => {
      expect(validator.isValid(null)).toBe(false);
      expect(validator.isValid({ type: 'INVALID_TYPE' })).toBe(false);
      expect(validator.isValid({ type: 'TAB_CLOSE', payload: {} })).toBe(false);
      expect(validator.isValid({ type: 'TAB_CLOSE', payload: { id: '' } })).toBe(false);
      expect(validator.isValid({ type: 'BOOKMARK_ADD', payload: { url: '' } })).toBe(false);
      expect(validator.isValid({ type: 'SETTINGS_UPDATE', payload: 'not-object' })).toBe(false);
    });

    it('validates TAB_NAVIGATE requires url', () => {
      expect(validator.isValid({ type: 'TAB_NAVIGATE', payload: { id: 'a', url: 'https://test.com' } })).toBe(true);
      expect(validator.isValid({ type: 'TAB_NAVIGATE', payload: { id: 'a' } })).toBe(false);
    });

    it('validates EXT_LOAD_UNPACKED requires path', () => {
      expect(validator.isValid({ type: 'EXT_LOAD_UNPACKED', payload: { path: '/ext' } })).toBe(true);
      expect(validator.isValid({ type: 'EXT_LOAD_UNPACKED', payload: {} })).toBe(false);
    });

    it('validates all ID-requiring actions', () => {
      const idActions = [
        'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS', 'TAB_GO_BACK',
        'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
        'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
        'BOOKMARK_REMOVE',
      ];
      for (const type of idActions) {
        expect(validator.isValid({ type, payload: { id: 'test-id', url: 'https://x.com' } })).toBe(true);
        expect(validator.isValid({ type, payload: {} })).toBe(false);
      }
    });

    it('validates actions without payload requirements', () => {
      expect(validator.isValid({ type: 'TAB_NEW' })).toBe(true);
      expect(validator.isValid({ type: 'TAB_NEW', payload: { url: 'https://x.com' } })).toBe(true);
      expect(validator.isValid({ type: 'HISTORY_CLEAR' })).toBe(true);
      expect(validator.isValid({ type: 'ADBLOCK_TOGGLE' })).toBe(true);
      expect(validator.isValid({ type: 'EXT_DIALOG_OPEN' })).toBe(true);
      expect(validator.isValid({ type: 'TAB_REORDER', payload: { sourceId: 'tab-1', targetId: 'tab-2' } })).toBe(true);
    });

    it('validates BOOKMARK_ADD requires url and title', () => {
      expect(validator.isValid({ type: 'BOOKMARK_ADD', payload: { url: 'https://x.com', title: 'X' } })).toBe(true);
      expect(validator.isValid({ type: 'BOOKMARK_ADD', payload: { url: 'https://x.com' } })).toBe(false);
      expect(validator.isValid({ type: 'BOOKMARK_ADD', payload: { title: 'X' } })).toBe(false);
    });

    it('rejects non-object inputs', () => {
      expect(validator.isValid(undefined)).toBe(false);
      expect(validator.isValid(42)).toBe(false);
      expect(validator.isValid('string')).toBe(false);
      expect(validator.isValid([])).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    it('allows requests under limit', () => {
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.check()).toBe(true);
      }
    });

    it('blocks requests over limit', () => {
      for (let i = 0; i < 100; i++) {
        rateLimiter.check();
      }
      expect(rateLimiter.check()).toBe(false);
    });
  });

  describe('Logger', () => {
    it('emits log events to EventBus', async () => {
      const handler = vi.fn();
      eventBus.on(EventTypes.DEBUG_LOG, handler);

      logger.info('Test message', { key: 'value' });

      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'INFO',
          source: 'Test',
          message: 'Test message',
          data: { key: 'value' },
        })
      );
    });

    it('child logger inherits parent source', async () => {
      const childLogger = logger.child('Child');
      const handler = vi.fn();
      eventBus.on(EventTypes.DEBUG_LOG, handler);

      childLogger.warn('Child message');

      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'Test:Child',
        })
      );
    });
  });
});
