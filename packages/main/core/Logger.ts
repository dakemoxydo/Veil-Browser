import { EventBus, EventTypes } from './EventBus';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static globalLevel: LogLevel = LogLevel.DEBUG;
  private eventBus: EventBus;

  constructor(private source: string) {
    this.eventBus = EventBus.getInstance();
  }

  public static setLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < Logger.globalLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${this.source}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LogLevel.INFO:
        console.log(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
    }

    // Emit to EventBus for debug window
    this.eventBus.emit(EventTypes.DEBUG_LOG, { timestamp, level: levelName, source: this.source, message, data });
  }

  public child(subSource: string): Logger {
    return new Logger(`${this.source}:${subSource}`);
  }
}
