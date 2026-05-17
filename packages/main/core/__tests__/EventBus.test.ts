import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, EventTypes } from '../EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    // Reset singleton
    (EventBus as any).instance = undefined;
    bus = EventBus.getInstance();
  });

  it('returns the same singleton instance', () => {
    const a = EventBus.getInstance();
    const b = EventBus.getInstance();
    expect(a).toBe(b);
  });

  it('calls handler on emit', async () => {
    const handler = vi.fn();
    bus.on(EventTypes.TAB_CREATED, handler);
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    expect(handler).toHaveBeenCalledWith({ id: '1' });
  });

  it('supports multiple handlers for same event', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(EventTypes.TAB_CREATED, h1);
    bus.on(EventTypes.TAB_CREATED, h2);
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe via returned function', async () => {
    const handler = vi.fn();
    const off = bus.on(EventTypes.TAB_CREATED, handler);
    off();
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribe via off()', async () => {
    const handler = vi.fn();
    bus.on(EventTypes.TAB_CREATED, handler);
    bus.off(EventTypes.TAB_CREATED, handler);
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires handler only once', async () => {
    const handler = vi.fn();
    bus.once(EventTypes.TAB_CREATED, handler);
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    await bus.emit(EventTypes.TAB_CREATED, { id: '2' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: '1' });
  });

  it('stores event in history', async () => {
    await bus.emit(EventTypes.TAB_CREATED, { id: '1' });
    const history = bus.getEventHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[history.length - 1].type).toBe(EventTypes.TAB_CREATED);
  });

  it('handler errors do not propagate', async () => {
    const badHandler = vi.fn(() => { throw new Error('boom'); });
    const goodHandler = vi.fn();
    bus.on(EventTypes.TAB_CREATED, badHandler);
    bus.on(EventTypes.TAB_CREATED, goodHandler);
    await expect(bus.emit(EventTypes.TAB_CREATED, { id: '1' })).resolves.toBeUndefined();
    expect(goodHandler).toHaveBeenCalled();
  });
});
