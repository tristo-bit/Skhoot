import { audioService } from './audioService';

export type SttProvider = 'auto' | 'web-speech' | 'openai' | 'local';

export interface SttConfig {
  provider: SttProvider;
  localUrl: string;
}

const STORAGE_KEY = 'skhoot-stt-settings';

const defaultConfig: SttConfig = {
  provider: 'auto',
  localUrl: 'http://127.0.0.1:8000/v1/audio/transcriptions'
};

export const sttConfigStore = {
  get(): SttConfig {
    if (typeof window === 'undefined') return { ...defaultConfig };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultConfig };
      const parsed = JSON.parse(raw) as Partial<SttConfig>;
      return {
        provider: parsed.provider || defaultConfig.provider,
        localUrl: parsed.localUrl || defaultConfig.localUrl
      };
    } catch (error) {
      console.warn('[SttConfig] Failed to read settings:', error);
      return { ...defaultConfig };
    }
  },

  set(update: Partial<SttConfig>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.get();
      const next = { ...current, ...update };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[SttConfig] Failed to save settings:', error);
    }
  },

  getProviderPreference(): SttProvider {
    return this.get().provider;
  },

  hasWebSpeechSupport(): boolean {
    return audioService.isSpeechRecognitionSupported();
  }
};

export default sttConfigStore;
