import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler, ErrorSeverity } from '../ErrorHandler';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    (ErrorHandler as any).instance = undefined;
    handler = ErrorHandler.getInstance();
  });

  it('returns the same singleton instance', () => {
    const a = ErrorHandler.getInstance();
    const b = ErrorHandler.getInstance();
    expect(a).toBe(b);
  });

  it('handle stores error in history', () => {
    handler.handle('TEST_ERROR', 'test message', ErrorSeverity.LOW, 'Test');
    const errors = handler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('TEST_ERROR');
    expect(errors[0].message).toBe('test message');
    expect(errors[0].severity).toBe(ErrorSeverity.LOW);
    expect(errors[0].source).toBe('Test');
  });

  it('getErrorsBySeverity filters correctly', () => {
    handler.handle('ERR1', 'msg1', ErrorSeverity.LOW, 'Test');
    handler.handle('ERR2', 'msg2', ErrorSeverity.HIGH, 'Test');
    handler.handle('ERR3', 'msg3', ErrorSeverity.HIGH, 'Test');

    expect(handler.getErrorsBySeverity(ErrorSeverity.LOW)).toHaveLength(1);
    expect(handler.getErrorsBySeverity(ErrorSeverity.HIGH)).toHaveLength(2);
    expect(handler.getErrorsBySeverity(ErrorSeverity.CRITICAL)).toHaveLength(0);
  });

  it('handleAsync catches and stores errors', async () => {
    const failingFn = async () => { throw new Error('async boom'); };
    const result = await handler.handleAsync('ASYNC_ERR', failingFn, 'Test');
    expect(result).toBeNull();
    expect(handler.getErrors()).toHaveLength(1);
    expect(handler.getErrors()[0].message).toContain('async boom');
  });

  it('handleAsync returns result on success', async () => {
    const successFn = async () => 42;
    const result = await handler.handleAsync('ASYNC_OK', successFn, 'Test');
    expect(result).toBe(42);
    expect(handler.getErrors()).toHaveLength(0);
  });

  it('clearErrors empties the history', () => {
    handler.handle('ERR', 'msg', ErrorSeverity.LOW, 'Test');
    expect(handler.getErrors()).toHaveLength(1);
    handler.clearErrors();
    expect(handler.getErrors()).toHaveLength(0);
  });
});
