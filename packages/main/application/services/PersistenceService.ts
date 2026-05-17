import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ErrorHandler, ErrorSeverity } from '../../core/ErrorHandler';

export class PersistenceService {
  private dataDir: string;
  private errorHandler: ErrorHandler;
  private saveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.dataDir = path.join(app.getPath('userData'), 'VeilBrowser');
    this.errorHandler = ErrorHandler.getInstance();
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (error) {
      this.errorHandler.handle(
        'DATA_DIR_CREATE_FAILED',
        String(error),
        ErrorSeverity.HIGH,
        'PersistenceService'
      );
    }
  }

  public load<T>(filename: string, defaultValue: T): T {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      this.errorHandler.handle(
        'PERSISTENCE_LOAD_FAILED',
        `Failed to load ${filename}: ${error}`,
        ErrorSeverity.MEDIUM,
        'PersistenceService'
      );
      return defaultValue;
    }
  }

  public save(filename: string, data: unknown): void {
    // Debounce saves
    const existingTimer = this.saveTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.saveTimers.set(filename, setTimeout(() => {
      this.saveTimers.delete(filename);
      try {
        const filePath = path.join(this.dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (error) {
        this.errorHandler.handle(
          'PERSISTENCE_SAVE_FAILED',
          `Failed to save ${filename}: ${error}`,
          ErrorSeverity.MEDIUM,
          'PersistenceService'
        );
      }
    }, 500));
  }

  public exists(filename: string): boolean {
    return fs.existsSync(path.join(this.dataDir, filename));
  }

  public delete(filename: string): void {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.errorHandler.handle(
        'PERSISTENCE_DELETE_FAILED',
        `Failed to delete ${filename}: ${error}`,
        ErrorSeverity.LOW,
        'PersistenceService'
      );
    }
  }

  public getDataDir(): string {
    return this.dataDir;
  }
}
