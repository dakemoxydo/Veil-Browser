import { WebContents } from 'electron';
import { VeilState } from '@veil/shared';
import { EventHandler, DomainEvent } from './EventBus';
import { ErrorSeverity, AppError } from './ErrorHandler';

export interface IEventBus {
  on<T>(eventType: string, handler: EventHandler<T>): () => void;
  off<T>(eventType: string, handler: EventHandler<T>): void;
  emit<T>(eventType: string, data: T): Promise<void>;
  once<T>(eventType: string, handler: EventHandler<T>): () => void;
  getEventHistory(): DomainEvent[];
  clearHistory(): void;
  reset(): void;
}

export interface IErrorHandler {
  handle(code: string, message: string, severity: ErrorSeverity, source: string, context?: unknown): void;
  handleAsync<T>(code: string, fn: () => Promise<T>, source: string, severity?: ErrorSeverity): Promise<T | null>;
  getErrors(): AppError[];
  getErrorsBySeverity(severity: ErrorSeverity): AppError[];
  clearErrors(): void;
}

export interface IStateBroadcaster {
  setWebContents(webContents: WebContents): void;
  getState(): VeilState;
  patch(patch: Partial<VeilState>): void;
}

export interface IPersistenceService {
  load<T>(filename: string, defaultValue: T): T;
  save(filename: string, data: unknown): void;
  flush(): void;
  exists(filename: string): boolean;
  delete(filename: string): void;
}

export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  child(subSource: string): ILogger;
}
