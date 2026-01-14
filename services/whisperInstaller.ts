/**
 * Whisper STT Installation and Management Service
 * 
 * Handles downloading, installing, and managing the local whisper.cpp
 * server for cross-platform speech-to-text.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/** Whisper installation and runtime status */
export interface WhisperStatus {
  installed: boolean;
  version: string | null;
  binary_path: string | null;
  models: WhisperModel[];
  server_running: boolean;
  server_port: number | null;
  platform: string;
  arch: string;
  build_available: boolean;
  build_requirements: string[];
}

/** Information about an installed Whisper model */
export interface WhisperModel {
  name: string;
  size_mb: number;
  path: string;
  is_downloaded: boolean;
}

/** Available models for download */
export interface AvailableModel {
  name: string;
  display_name: string;
  size_mb: number;
  url: string;
  description: string;
}

/** Installation progress event */
export interface InstallProgress {
  stage: string;
  progress: number;
  message: string;
}

/** Progress callback type */
export type ProgressCallback = (progress: InstallProgress) => void;

class WhisperInstallerService {
  private progressListeners: Map<string, UnlistenFn> = new Map();

  /**
   * Check if running in Tauri environment
   */
  private isTauri(): boolean {
    try {
      return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    } catch {
      return false;
    }
  }

  /**
   * Get the current whisper installation status
   */
  async getStatus(): Promise<WhisperStatus> {
    if (!this.isTauri()) {
      return {
        installed: false,
        version: null,
        binary_path: null,
        models: [],
        server_running: false,
        server_port: null,
        platform: 'browser',
        arch: 'unknown',
        build_available: false,
        build_requirements: [],
      };
    }

    try {
      return await invoke<WhisperStatus>('check_whisper_status');
    } catch (error) {
      console.error('[WhisperInstaller] Failed to get status:', error);
      throw error;
    }
  }

  /**
   * Get list of available models for download
   */
  async getAvailableModels(): Promise<AvailableModel[]> {
    if (!this.isTauri()) {
      return [];
    }

    try {
      return await invoke<AvailableModel[]>('get_whisper_models');
    } catch (error) {
      console.error('[WhisperInstaller] Failed to get models:', error);
      throw error;
    }
  }

  /**
   * Install the whisper binary
   * @param onProgress - Callback for progress updates
   */
  async installBinary(onProgress?: ProgressCallback): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Whisper installation requires the Tauri desktop app');
    }

    // Set up progress listener
    if (onProgress) {
      const unlisten = await listen<InstallProgress>('whisper-install-progress', (event) => {
        onProgress(event.payload);
      });
      this.progressListeners.set('install', unlisten);
    }

    try {
      const result = await invoke<string>('install_whisper_binary');
      return result;
    } finally {
      // Clean up listener
      const unlisten = this.progressListeners.get('install');
      if (unlisten) {
        unlisten();
        this.progressListeners.delete('install');
      }
    }
  }

  /**
   * Download a specific whisper model
   * @param modelName - Name of the model to download (e.g., 'ggml-base.en.bin')
   * @param onProgress - Callback for progress updates
   */
  async downloadModel(modelName: string, onProgress?: ProgressCallback): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Model download requires the Tauri desktop app');
    }

    // Set up progress listener
    if (onProgress) {
      const unlisten = await listen<InstallProgress>('whisper-install-progress', (event) => {
        onProgress(event.payload);
      });
      this.progressListeners.set('model', unlisten);
    }

    try {
      const result = await invoke<string>('download_whisper_model', { modelName });
      return result;
    } finally {
      // Clean up listener
      const unlisten = this.progressListeners.get('model');
      if (unlisten) {
        unlisten();
        this.progressListeners.delete('model');
      }
    }
  }

  /**
   * Start the local whisper server
   * @param modelName - Name of the model to use
   * @param port - Port to run the server on (default: 8000)
   */
  async startServer(modelName: string, port: number = 8000): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Whisper server requires the Tauri desktop app');
    }

    try {
      return await invoke<string>('start_whisper_server', { modelName, port });
    } catch (error) {
      console.error('[WhisperInstaller] Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the local whisper server
   */
  async stopServer(): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Whisper server requires the Tauri desktop app');
    }

    try {
      return await invoke<string>('stop_whisper_server');
    } catch (error) {
      console.error('[WhisperInstaller] Failed to stop server:', error);
      throw error;
    }
  }

  /**
   * Uninstall whisper
   * @param removeModels - Whether to also remove downloaded models
   */
  async uninstall(removeModels: boolean = false): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Whisper uninstall requires the Tauri desktop app');
    }

    try {
      return await invoke<string>('uninstall_whisper', { removeModels });
    } catch (error) {
      console.error('[WhisperInstaller] Failed to uninstall:', error);
      throw error;
    }
  }

  /**
   * Delete a specific model
   * @param modelName - Name of the model to delete
   */
  async deleteModel(modelName: string): Promise<string> {
    if (!this.isTauri()) {
      throw new Error('Model deletion requires the Tauri desktop app');
    }

    try {
      return await invoke<string>('delete_whisper_model', { modelName });
    } catch (error) {
      console.error('[WhisperInstaller] Failed to delete model:', error);
      throw error;
    }
  }

  /**
   * Check if the whisper server is responding
   * @param port - Port to check (default: 8000)
   */
  async isServerHealthy(port: number = 8000): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the local STT URL for the whisper server
   * @param port - Port the server is running on
   */
  getLocalSttUrl(port: number = 8000): string {
    return `http://127.0.0.1:${port}/v1/audio/transcriptions`;
  }
}

export const whisperInstaller = new WhisperInstallerService();
