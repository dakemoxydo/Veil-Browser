import { app } from 'electron';
import * as path from 'path';

export interface DevConfig {
  port: number;
  hotReload: boolean;
  openDevTools: boolean;
}

export interface PathsConfig {
  userData: string;
  extensions: string;
  downloads: string;
  logs: string;
}

export interface FeaturesConfig {
  adblock: boolean;
  extensions: boolean;
  debugWindow: boolean;
}

export interface AppConfig {
  dev: DevConfig;
  paths: PathsConfig;
  features: FeaturesConfig;
  isPackaged: boolean;
  isDev: boolean;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    const isDev = !app.isPackaged;
    const userData = app.getPath('userData');

    this.config = {
      dev: {
        port: 3000,
        hotReload: true,
        openDevTools: false,
      },
      paths: {
        userData,
        extensions: path.join(userData, 'extensions'),
        downloads: app.getPath('downloads'),
        logs: path.join(userData, 'logs'),
      },
      features: {
        adblock: true,
        extensions: true,
        debugWindow: true,
      },
      isPackaged: app.isPackaged,
      isDev,
    };
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get(): AppConfig {
    return this.config;
  }

  public getDev(): DevConfig {
    return this.config.dev;
  }

  public getPaths(): PathsConfig {
    return this.config.paths;
  }

  public getFeatures(): FeaturesConfig {
    return this.config.features;
  }

  public isDev(): boolean {
    return this.config.isDev;
  }

  public isPackaged(): boolean {
    return this.config.isPackaged;
  }

  public getRendererUrl(): string {
    if (this.config.isDev) {
      return `http://localhost:${this.config.dev.port}`;
    }
    return `file://${path.join(app.getAppPath(), 'packages/renderer/dist/index.html')}`;
  }

  public getPreloadPath(): string {
    if (this.config.isPackaged) {
      return path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload.js');
    }
    return path.join(__dirname, '../preload.js');
  }

  public getIncognitoPreloadPath(): string {
    if (this.config.isPackaged) {
      return path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload-incognito.js');
    }
    return path.join(__dirname, '../preload-incognito.js');
  }

  public updateDev(dev: Partial<DevConfig>): void {
    this.config.dev = { ...this.config.dev, ...dev };
  }

  public updateFeatures(features: Partial<FeaturesConfig>): void {
    this.config.features = { ...this.config.features, ...features };
  }
}
