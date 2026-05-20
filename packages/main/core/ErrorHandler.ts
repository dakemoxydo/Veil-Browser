import { EventTypes } from './EventBus';
import { IEventBus, IErrorHandler } from './interfaces';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  source: string;
  timestamp: number;
  context?: unknown;
}

export class ErrorHandler implements IErrorHandler {
  private errors: AppError[] = [];
  private maxErrors = 1000;

  constructor(private eventBus: IEventBus) {}

  public handle(
    code: string,
    message: string,
    severity: ErrorSeverity,
    source: string,
    context?: unknown
  ): void {
    const error: AppError = {
      code,
      message,
      severity,
      source,
      timestamp: Date.now(),
      context,
    };

    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console
    const logMethod = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
      ? console.error
      : severity === ErrorSeverity.MEDIUM
      ? console.warn
      : console.info;

    logMethod(`[${source}] ${code}: ${message}`, context || '');

    // Emit event (fire-and-forget, but catch to prevent unhandled rejection)
    this.eventBus.emit(EventTypes.DEBUG_ERROR, error).catch(() => {});
  }

  public handleAsync<T>(
    code: string,
    fn: () => Promise<T>,
    source: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<T | null> {
    return fn().catch((error) => {
      this.handle(code, String(error), severity, source);
      return null;
    });
  }

  public getErrors(): AppError[] {
    return [...this.errors];
  }

  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  public clearErrors(): void {
    this.errors = [];
  }
}
