import { app, WebContents } from 'electron';
import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { BaseService } from '../core/BaseService';

interface SettingsServiceLike {
  getSettings(): { privacy: { fingerprintProtection: boolean } };
}

export class FingerprintProtectionService extends BaseService {
  public name = 'FingerprintProtection';
  private isEnabled = false;
  private webContentsHandler: ((event: Electron.Event, webContents: WebContents) => void) | null = null;
  private domReadyCleanups: Map<number, () => void> = new Map();

  constructor(
    private session: ISession,
    private settingsService: SettingsServiceLike,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.isEnabled = this.settingsService.getSettings().privacy.fingerprintProtection;
    if (this.isEnabled) {
      this.setupProtection();
    }
    this.logger.info('FingerprintProtection initialized');
  }

  private setupProtection() {
    // Inject fingerprint protection scripts into every new webContents
    this.webContentsHandler = (_, webContents) => {
      const domReadyHandler = () => {
        if (!this.isEnabled) return;
        this.injectProtection(webContents);
      };
      webContents.on('dom-ready', domReadyHandler);
      // Track for cleanup on destroy — use numeric id to avoid leaking WebContents references
      const wcId = webContents.id;
      this.domReadyCleanups.set(wcId, () => {
        webContents.removeListener('dom-ready', domReadyHandler);
      });
      // Auto-remove when webContents is destroyed
      webContents.once('destroyed', () => {
        this.domReadyCleanups.delete(wcId);
      });
    };
    app.on('web-contents-created', this.webContentsHandler);
  }

  private injectProtection(webContents: WebContents) {
    if (webContents.isDestroyed()) return;

    // Block canvas fingerprinting — override toDataURL/toBlob
    const canvasProtection = `
      (function() {
        const noise = () => Math.random() * 0.01 - 0.005;
        const addNoise = (canvas) => {
          try {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 16), Math.min(canvas.height, 16));
              for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + Math.floor(noise() * 10)));
              }
              ctx.putImageData(imageData, 0, 0);
            }
          } catch {}
        };
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
          addNoise(this);
          return origToDataURL.call(this, type, quality);
        };
        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          addNoise(this);
          return origToBlob.call(this, callback, type, quality);
        };
      })();
    `;

    // Block WebRTC IP leak
    const webrtcProtection = `
      (function() {
        try {
          if (window.RTCPeerConnection) {
            const OrigRTC = window.RTCPeerConnection;
            const PatchedRTC = function(config, constraints) {
              if (config && config.iceServers) {
                config.iceServers = [];
              }
              return new OrigRTC(config, constraints);
            };
            PatchedRTC.prototype = OrigRTC.prototype;
            Object.setPrototypeOf(PatchedRTC, OrigRTC);
            window.RTCPeerConnection = PatchedRTC;
          }
          if (window.webkitRTCPeerConnection) {
            const OrigRTC = window.webkitRTCPeerConnection;
            const PatchedRTC = function(config, constraints) {
              if (config && config.iceServers) {
                config.iceServers = [];
              }
              return new OrigRTC(config, constraints);
            };
            PatchedRTC.prototype = OrigRTC.prototype;
            Object.setPrototypeOf(PatchedRTC, OrigRTC);
            window.webkitRTCPeerConnection = PatchedRTC;
          }
        } catch {}
      })();
    `;

    // Spoof navigator properties — each defineProperty wrapped individually
    const navigatorProtection = `
      (function() {
        try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4, configurable: true }); } catch {}
        try { Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true }); } catch {}
        try { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true }); } catch {}
      })();
    `;

    // WebGL fingerprint — return generic vendor/renderer strings
    const webglProtection = `
      (function() {
        try {
          const paramHandler = {
            apply: function(target, thisArg, args) {
              const param = args[0];
              // UNMASKED_VENDOR_WEBGL = 0x9245, UNMASKED_RENDERER_WEBGL = 0x9246
              if (param === 0x9245) return 'Google Inc. (Intel)';
              if (param === 0x9246) return 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.5)';
              return Reflect.apply(target, thisArg, args);
            }
          };
          const origGetParam = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = new Proxy(origGetParam, paramHandler);
          try {
            const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
            WebGL2RenderingContext.prototype.getParameter = new Proxy(origGetParam2, paramHandler);
          } catch {}
        } catch {}
        try {
          const extNames = new Set([
            'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float',
            'EXT_frag_depth', 'EXT_sRGB', 'EXT_texture_filter_anisotropic',
            'OES_element_index_uint', 'OES_standard_derivatives', 'OES_texture_float',
            'OES_texture_float_linear', 'OES_texture_half_float', 'OES_texture_half_float_linear',
            'OES_vertex_array_object', 'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_s3tc',
            'WEBGL_debug_renderer_info', 'WEBGL_depth_texture', 'WEBGL_lose_context',
          ]);
          const origGetExt = WebGLRenderingContext.prototype.getExtension;
          WebGLRenderingContext.prototype.getExtension = function(name) {
            if (!extNames.has(name)) return null;
            return origGetExt.call(this, name);
          };
          try {
            const origGetExt2 = WebGL2RenderingContext.prototype.getExtension;
            WebGL2RenderingContext.prototype.getExtension = function(name) {
              if (!extNames.has(name)) return null;
              return origGetExt2.call(this, name);
            };
          } catch {}
        } catch {}
      })();
    `;

    // AudioContext fingerprint — add noise to analyser frequency data and offline rendering
    const audioProtection = `
      (function() {
        try {
          const origCreateAnalyser = AudioContext.prototype.createAnalyser;
          AudioContext.prototype.createAnalyser = function() {
            const analyser = origCreateAnalyser.call(this);
            const origGetFloatFreq = analyser.getFloatFrequencyData.bind(analyser);
            analyser.getFloatFrequencyData = function(array) {
              origGetFloatFreq(array);
              for (let i = 0; i < array.length; i++) {
                array[i] += (Math.random() - 0.5) * 0.1;
              }
            };
            const origGetByteFreq = analyser.getByteFrequencyData.bind(analyser);
            analyser.getByteFrequencyData = function(array) {
              origGetByteFreq(array);
              for (let i = 0; i < array.length; i++) {
                array[i] = Math.max(0, Math.min(255, array[i] + Math.floor((Math.random() - 0.5) * 2)));
              }
            };
            return analyser;
          };
        } catch {}
        try {
          const origStartRendering = OfflineAudioContext.prototype.startRendering;
          OfflineAudioContext.prototype.startRendering = function() {
            return origStartRendering.call(this).then(function(buffer) {
              const data = buffer.getChannelData(0);
              for (let i = 0; i < Math.min(data.length, 100); i++) {
                data[i] += (Math.random() - 0.5) * 1e-7;
              }
              return buffer;
            });
          };
        } catch {}
      })();
    `;

    // Battery API — return dummy resolved values
    const batteryProtection = `
      (function() {
        try {
          navigator.getBattery = function() {
            return Promise.resolve({
              charging: true,
              chargingTime: 0,
              dischargingTime: Infinity,
              level: 1.0,
              addEventListener: function() {},
              removeEventListener: function() {},
              onchargingchange: null,
              onchargingtimechange: null,
              ondischargingtimechange: null,
              onlevelchange: null,
            });
          };
        } catch {}
      })();
    `;

    // Font enumeration — return a fixed common set
    const fontProtection = `
      (function() {
        try {
          const commonFonts = new Set([
            'Arial', 'Arial Black', 'Comic Sans MS', 'Courier', 'Courier New',
            'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
            'Microsoft Sans Serif', 'Palatino Linotype', 'Tahoma', 'Times',
            'Times New Roman', 'Trebuchet MS', 'Verdana',
          ]);
          if (document.fonts && document.fonts.forEach) {
            const origCheck = document.fonts.check.bind(document.fonts);
            document.fonts.check = function(font, text) {
              const family = font.split(/\\s+/).pop().replace(/['"]/g, '');
              if (commonFonts.has(family)) {
                return origCheck(font, text);
              }
              return false;
            };
          }
        } catch {}
      })();
    `;

    try {
      webContents.executeJavaScript(canvasProtection).catch(() => {});
      webContents.executeJavaScript(webrtcProtection).catch(() => {});
      webContents.executeJavaScript(navigatorProtection).catch(() => {});
      webContents.executeJavaScript(webglProtection).catch(() => {});
      webContents.executeJavaScript(audioProtection).catch(() => {});
      webContents.executeJavaScript(batteryProtection).catch(() => {});
      webContents.executeJavaScript(fontProtection).catch(() => {});
    } catch {
      // webContents may be destroyed
    }
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'SETTINGS_UPDATE' && action.payload?.privacy?.fingerprintProtection !== undefined) {
      this.isEnabled = action.payload.privacy.fingerprintProtection;
      if (this.isEnabled && !this.webContentsHandler) {
        this.setupProtection();
      }
    }
  }

  public destroy(): void {
    if (this.webContentsHandler) {
      app.removeListener('web-contents-created', this.webContentsHandler);
      this.webContentsHandler = null;
    }
    for (const cleanup of this.domReadyCleanups.values()) {
      cleanup();
    }
    this.domReadyCleanups.clear();
  }
}
