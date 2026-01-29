import { audioService } from './audioService';

export type SttProvider = 'auto' | 'web-speech' | 'openai' | 'custom';

export interface SttConfig {
  provider: SttProvider;
  customUrl?: string;
  customKey?: string;
}

const STORAGE_KEY = 'skhoot-stt-settings';

const defaultConfig: SttConfig = {
  provider: 'auto',
  customUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
  customKey: ''
};

export const sttConfigStore = {
  get(): SttConfig {
    if (typeof window === 'undefined') return { ...defaultConfig };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultConfig };
      const parsed = JSON.parse(raw) as Partial<SttConfig>;
      
      // Migration and sanitization
      return {
        provider: ((parsed.provider as any) === 'local' ? 'auto' : parsed.provider) || defaultConfig.provider,
        customUrl: parsed.customUrl || defaultConfig.customUrl,
        customKey: parsed.customKey || defaultConfig.customKey
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
      // Sanitize if legacy provider comes in
      if ((next.provider as any) === 'local') {
        next.provider = 'auto';
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      console.log('[SttConfig] Settings saved:', JSON.stringify(next));
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
