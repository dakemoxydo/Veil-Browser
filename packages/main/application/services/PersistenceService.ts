import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IErrorHandler, IPersistenceService } from '../../core/interfaces';

export class PersistenceService implements IPersistenceService {
  private static instances: PersistenceService[] = [];
  private dataDir: string;
  private pendingSaves: Map<string, { timer: ReturnType<typeof setTimeout>; data: unknown }> = new Map();

  public static flushAll(): void {
    for (const instance of PersistenceService.instances) {
      instance.flush();
    }
  }

  constructor(private errorHandler: IErrorHandler) {
    // Register first, so dispose() can always find us even if constructor fails later
    PersistenceService.instances.push(this);
    this.dataDir = path.join(app.getPath('userData'), 'VeilBrowser');
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

  private sanitizeFilename(filename: string): string {
    // Prevent path traversal — only allow basename
    return path.basename(filename);
  }

  public load<T>(filename: string, defaultValue: T): T {
    try {
      const filePath = path.join(this.dataDir, this.sanitizeFilename(filename));
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
    const existing = this.pendingSaves.get(filename);
    if (existing) {
      clearTimeout(existing.timer);
    }

    this.pendingSaves.set(filename, {
      data,
      timer: setTimeout(() => {
        this.pendingSaves.delete(filename);
        this.writeAsync(filename, data);
      }, 500),
    });
  }

  private writeAsync(filename: string, data: unknown): void {
    const sanitized = this.sanitizeFilename(filename);
    const filePath = path.join(this.dataDir, sanitized);
    const tmpPath = filePath + '.tmp';
    fs.writeFile(tmpPath, JSON.stringify(data), 'utf-8', (writeErr) => {
      if (writeErr) {
        this.errorHandler.handle(
          'PERSISTENCE_SAVE_FAILED',
          `Failed to save ${filename}: ${writeErr}`,
          ErrorSeverity.MEDIUM,
          'PersistenceService'
        );
        return;
      }
      fs.rename(tmpPath, filePath, (renameErr) => {
        if (renameErr) {
          this.errorHandler.handle(
            'PERSISTENCE_SAVE_FAILED',
            `Failed to rename temp file for ${filename}: ${renameErr}`,
            ErrorSeverity.MEDIUM,
            'PersistenceService'
          );
        }
      });
    });
  }

  private writeSync(filename: string, data: unknown): void {
    try {
      const sanitized = this.sanitizeFilename(filename);
      const filePath = path.join(this.dataDir, sanitized);
      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(data), 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (error) {
      this.errorHandler.handle(
        'PERSISTENCE_SAVE_FAILED',
        `Failed to save ${filename}: ${error}`,
        ErrorSeverity.MEDIUM,
        'PersistenceService'
      );
    }
  }

  public flush(): void {
    for (const [filename, { timer, data }] of this.pendingSaves.entries()) {
      clearTimeout(timer);
      this.writeSync(filename, data);
    }
    this.pendingSaves.clear();
  }

  public exists(filename: string): boolean {
    return fs.existsSync(path.join(this.dataDir, this.sanitizeFilename(filename)));
  }

  public delete(filename: string): void {
    try {
      const filePath = path.join(this.dataDir, this.sanitizeFilename(filename));
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

  public dispose(): void {
    this.flush();
    const index = PersistenceService.instances.indexOf(this);
    if (index !== -1) {
      PersistenceService.instances.splice(index, 1);
    }
  }
}
