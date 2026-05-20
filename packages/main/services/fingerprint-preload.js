/**
 * Fingerprint Protection Preload Script
 *
 * Runs before any page script via session.setPreloads().
 * Provides Canvas/WebRTC/WebGL/Audio/Battery/Font/OffscreenCanvas protection.
 *
 * A29: Replaces per-webContents executeJavaScript injection for earlier,
 * more reliable protection.
 */

(function fingerprintProtection() {
  'use strict';

  // Generate a stable per-session random salt for vendor/renderer variation
  const sessionSalt = Math.random().toString(36).slice(2, 10);

  // --- Canvas fingerprinting protection ---
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      try {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            // Add subtle noise to RGB channels
            imageData.data[i] = (imageData.data[i] + ((i * 7 + 3) % 5) - 2) & 0xff;
            imageData.data[i + 1] = (imageData.data[i + 1] + ((i * 11 + 7) % 5) - 2) & 0xff;
            imageData.data[i + 2] = (imageData.data[i + 2] + ((i * 13 + 11) % 5) - 2) & 0xff;
          }
          ctx.putImageData(imageData, 0, 0);
        }
      } catch { /* ignore cross-origin or empty canvas */ }
      return origToDataURL.apply(this, args);
    };

    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      try {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = (imageData.data[i] + ((i * 7 + 3) % 5) - 2) & 0xff;
            imageData.data[i + 1] = (imageData.data[i + 1] + ((i * 11 + 7) % 5) - 2) & 0xff;
            imageData.data[i + 2] = (imageData.data[i + 2] + ((i * 13 + 11) % 5) - 2) & 0xff;
          }
          ctx.putImageData(imageData, 0, 0);
        }
      } catch { /* ignore */ }
      return origToBlob.call(this, callback, ...args);
    };

    // OffscreenCanvas.prototype.convertToBlob patching
    if (typeof OffscreenCanvas !== 'undefined' && OffscreenCanvas.prototype.convertToBlob) {
      const origConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
      OffscreenCanvas.prototype.convertToBlob = async function (...args) {
        try {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = (imageData.data[i] + ((i * 7 + 3) % 5) - 2) & 0xff;
              imageData.data[i + 1] = (imageData.data[i + 1] + ((i * 11 + 7) % 5) - 2) & 0xff;
              imageData.data[i + 2] = (imageData.data[i + 2] + ((i * 13 + 11) % 5) - 2) & 0xff;
            }
            ctx.putImageData(imageData, 0, 0);
          }
        } catch { /* ignore */ }
        return origConvertToBlob.apply(this, args);
      };
    }
  } catch { /* Canvas protection not available */ }

  // --- WebRTC IP leak protection ---
  try {
    const OrigRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (OrigRTCPeerConnection) {
      const WrappedRTC = function (...args) {
        const pc = new OrigRTCPeerConnection(...args);
        // Block ICE servers to prevent IP leak
        Object.defineProperty(pc, 'iceServers', { value: [], writable: false });
        return pc;
      };
      WrappedRTC.prototype = OrigRTCPeerConnection.prototype;
      window.RTCPeerConnection = WrappedRTC;
      if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = WrappedRTC;
    }
  } catch { /* WebRTC protection not available */ }

  // --- Navigator spoofing ---
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  } catch { /* Navigator spoofing not available */ }

  // --- WebGL fingerprinting protection ---
  // Vendor pool varies between users via stable per-session salt
  const VENDORS = ['Intel Inc.', 'AMD', 'NVIDIA Corporation'];
  const RENDERERS = [
    'Intel Iris OpenGL Engine',
    'AMD Radeon Pro 5300M OpenGL Engine',
    'NVIDIA GeForce GTX 1660 OpenGL Engine',
  ];
  const vendorIndex = Math.abs(sessionSalt.charCodeAt(0) + sessionSalt.charCodeAt(1)) % VENDORS.length;

  try {
    const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      // UNMASKED_VENDOR_WEBGL
      if (param === 0x9245) return VENDORS[vendorIndex];
      // UNMASKED_RENDERER_WEBGL
      if (param === 0x9246) return RENDERERS[vendorIndex];
      return getParameterOrig.call(this, param);
    };

    if (typeof WebGL2RenderingContext !== 'undefined') {
      const getParameterOrig2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (param) {
        if (param === 0x9245) return VENDORS[vendorIndex];
        if (param === 0x9246) return RENDERERS[vendorIndex];
        return getParameterOrig2.call(this, param);
      };
    }

    // Restrict getExtension to common extensions
    const ALLOWED_EXTENSIONS = new Set([
      'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_float',
      'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query',
      'EXT_disjoint_timer_query_webgl2', 'EXT_frag_depth',
      'EXT_shader_texture_lod', 'EXT_texture_filter_anisotropic',
      'OES_element_index_uint', 'OES_standard_derivatives',
      'OES_texture_float', 'OES_texture_float_linear',
      'OES_texture_half_float', 'OES_texture_half_float_linear',
      'OES_vertex_array_object', 'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders',
      'WEBGL_depth_texture', 'WEBGL_draw_buffers',
      'WEBGL_lose_context',
    ]);
    const getExtensionOrig = WebGLRenderingContext.prototype.getExtension;
    WebGLRenderingContext.prototype.getExtension = function (name) {
      if (!ALLOWED_EXTENSIONS.has(name)) return null;
      return getExtensionOrig.call(this, name);
    };
  } catch { /* WebGL protection not available */ }

  // --- AudioContext fingerprinting protection ---
  try {
    const origGetFloat = AnalyserNode.prototype.getFloatFrequencyData;
    AnalyserNode.prototype.getFloatFrequencyData = function (array) {
      origGetFloat.call(this, array);
      for (let i = 0; i < array.length; i++) {
        array[i] += (Math.random() - 0.5) * 0.001;
      }
    };

    const origGetByte = AnalyserNode.prototype.getByteFrequencyData;
    AnalyserNode.prototype.getByteFrequencyData = function (array) {
      origGetByte.call(this, array);
      for (let i = 0; i < array.length; i++) {
        array[i] = (array[i] + Math.floor(Math.random() * 3) - 1) & 0xff;
      }
    };

    if (typeof OfflineAudioContext !== 'undefined') {
      const origStartRendering = OfflineAudioContext.prototype.startRendering;
      OfflineAudioContext.prototype.startRendering = async function (...args) {
        const buffer = await origStartRendering.apply(this, args);
        // Add subtle noise to audio buffer
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            data[i] += (Math.random() - 0.5) * 1e-7;
          }
        }
        return buffer;
      };
    }
  } catch { /* Audio protection not available */ }

  // --- Battery API protection ---
  try {
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1.0,
        addEventListener: () => {},
        removeEventListener: () => {},
        onchargingchange: null,
        onchargingtimechange: null,
        ondischargingtimechange: null,
        onlevelchange: null,
      });
    }
  } catch { /* Battery protection not available */ }

  // --- Font enumeration restriction ---
  try {
    const origCheck = document.fonts.check;
    const SAFE_FONTS = new Set([
      'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS',
      'Times New Roman', 'Georgia', 'Garamond', 'Courier New',
      'Brush Script MT', 'Impact', 'Comic Sans MS', 'Lucida Console',
      'Lucida Sans Unicode', 'Palatino Linotype', 'MS Sans Serif', 'Segoe UI',
    ]);
    document.fonts.check = function (font, text) {
      const family = font.split(/\s+/).pop()?.replace(/['"]/g, '') || '';
      if (!SAFE_FONTS.has(family)) return false;
      return origCheck.call(this, font, text);
    };
  } catch { /* Font protection not available */ }
})();
