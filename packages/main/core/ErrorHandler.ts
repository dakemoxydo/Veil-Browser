import { EventBus, EventTypes } from './EventBus';

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

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: AppError[] = [];
  private maxErrors = 1000;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

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
      : console.log;

    logMethod(`[${source}] ${code}: ${message}`, context || '');

    // Emit event
    this.eventBus.emit(EventTypes.DEBUG_ERROR, error);
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
