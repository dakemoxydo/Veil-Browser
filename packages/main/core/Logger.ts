import { EventTypes } from './EventBus';
import { IEventBus, ILogger } from './interfaces';

export enum LoggerLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger implements ILogger {
  private static globalLevel: LoggerLevel = LoggerLevel.DEBUG;

  constructor(
    private source: string,
    private eventBus: IEventBus
  ) {}

  public static setLevel(level: LoggerLevel): void {
    Logger.globalLevel = level;
  }

  public debug(message: string, data?: unknown): void {
    this.log(LoggerLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LoggerLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LoggerLevel.WARN, message, data);
  }

  public error(message: string, data?: unknown): void {
    this.log(LoggerLevel.ERROR, message, data);
  }

  private log(level: LoggerLevel, message: string, data?: unknown): void {
    if (level < Logger.globalLevel) return;

    const timestamp = new Date(Date.now()).toISOString();
    const levelName = LoggerLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${this.source}]`;

    switch (level) {
      case LoggerLevel.DEBUG:
        console.debug(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LoggerLevel.INFO:
        console.info(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LoggerLevel.WARN:
        console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case LoggerLevel.ERROR:
        console.error(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
    }

    // Emit to EventBus for debug window
    this.eventBus.emit(EventTypes.DEBUG_LOG, { timestamp, level: levelName, source: this.source, message, data });
  }

  public child(subSource: string): ILogger {
    return new Logger(`${this.source}:${subSource}`, this.eventBus);
  }
}
