const API_KEY_STORAGE_KEY = 'skhoot-api-key';

export const apiKeyStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const value = localStorage.getItem(API_KEY_STORAGE_KEY);
      return value && value.trim() ? value : null;
    } catch (error) {
      console.warn('[ApiKeyStore] Failed to read API key:', error);
      return null;
    }
  },

  set(value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, value);
    } catch (error) {
      console.warn('[ApiKeyStore] Failed to save API key:', error);
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.warn('[ApiKeyStore] Failed to clear API key:', error);
    }
  },

  has(): boolean {
    return !!this.get();
  }
};

export default apiKeyStore;
