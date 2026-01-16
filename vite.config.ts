import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Check if we're running under Tauri
// TAURI_PLATFORM is set by Tauri CLI during dev/build
// We also check TAURI_ENV_PLATFORM for Tauri v2
const isTauriEnv = () => {
  return !!(process.env.TAURI_PLATFORM || process.env.TAURI_ENV_PLATFORM || process.env.TAURI_DEBUG);
};

// Plugin to handle Tauri imports in web mode
function tauriStubPlugin(): Plugin {
  const tauriModules = [
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-shell',
    '@tauri-apps/plugin-notification',
    '@tauri-apps/plugin-dialog',
    '@tauri-apps/api/core',
    '@tauri-apps/api/window',
    '@tauri-apps/api/event',
    '@tauri-apps/api',
  ];

  // Cache the check result
  const shouldStub = !isTauriEnv();
  console.log('[Vite] Tauri stub plugin:', shouldStub ? 'ACTIVE (web mode)' : 'DISABLED (Tauri mode)');
  console.log('[Vite] Environment:', { 
    TAURI_PLATFORM: process.env.TAURI_PLATFORM,
    TAURI_ENV_PLATFORM: process.env.TAURI_ENV_PLATFORM,
    TAURI_DEBUG: process.env.TAURI_DEBUG
  });

  return {
    name: 'tauri-stub',
    enforce: 'pre',
    resolveId(id) {
      // In web mode, stub out Tauri modules
      if (shouldStub && tauriModules.some(m => id === m || id.startsWith(m + '/'))) {
        return { id: `\0tauri-stub:${id}`, moduleSideEffects: false };
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0tauri-stub:')) {
        // Return comprehensive stub that exports all commonly used functions
        // These will throw at runtime if actually called, but the code has runtime checks
        const notAvailable = '() => Promise.reject(new Error("Tauri not available"))';
        const notAvailableSync = '() => { throw new Error("Tauri not available"); }';
        return `
          export default {};
          // Core
          export const invoke = ${notAvailable};
          // FS plugin
          export const readBinaryFile = ${notAvailable};
          export const readTextFile = ${notAvailable};
          export const writeFile = ${notAvailable};
          export const writeBinaryFile = ${notAvailable};
          export const readDir = ${notAvailable};
          export const createDir = ${notAvailable};
          export const removeDir = ${notAvailable};
          export const removeFile = ${notAvailable};
          export const renameFile = ${notAvailable};
          export const copyFile = ${notAvailable};
          export const exists = ${notAvailable};
          // Shell plugin
          export const open = ${notAvailable};
          export const Command = { create: ${notAvailable} };
          // Notification plugin
          export const isPermissionGranted = ${notAvailable};
          export const requestPermission = ${notAvailable};
          export const sendNotification = ${notAvailable};
          // Window API
          export const getCurrentWindow = () => ({
            close: ${notAvailable},
            minimize: ${notAvailable},
            startDragging: ${notAvailable},
            startResizeDragging: ${notAvailable},
            outerSize: ${notAvailable},
            isMaximized: ${notAvailable},
            isFullscreen: ${notAvailable},
            scaleFactor: ${notAvailable},
            onResized: ${notAvailable},
            onScaleChanged: ${notAvailable},
            onFocusChanged: ${notAvailable},
          });
          export const currentMonitor = ${notAvailable};
          // Event API
          export const listen = ${notAvailable};
          export const emit = ${notAvailable};
          export const once = ${notAvailable};
        `;
      }
      return null;
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isTauri = isTauriEnv();
    
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: true,
        watch: {
          // Exclude directories that cause file watcher issues
          ignored: [
            '**/node_modules/**',
            '**/backend/target/**',
            '**/documentation/**',
            '**/dist/**',
            '**/.git/**'
          ]
        }
      },
      plugins: [
        // Only use stub plugin in web mode
        ...(!isTauri ? [tauriStubPlugin()] : []),
        react()
      ],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Tauri expects a fixed port, fail if that port is not available
      clearScreen: false,
      // to make use of `TAURI_DEBUG` and other env variables
      // https://tauri.studio/v1/guides/environment-variables
      envPrefix: ['VITE_', 'TAURI_'],
      build: {
        // Tauri supports es2021
        target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
        // don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        // produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
      },
    };
});
