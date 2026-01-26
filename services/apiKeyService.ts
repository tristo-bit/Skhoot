/**
  * Secure API Key Service
 * Communicates with Tauri backend for encrypted key storage
 * Falls back to localStorage when Tauri is not available (web dev mode)
 */

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Dynamic import for Tauri is handled in the class constructor

// LocalStorage fallback keys
const STORAGE_PREFIX = 'skhoot_api_key_';
const MODEL_PREFIX = 'skhoot_model_';
const ACTIVE_PROVIDER_KEY = 'skhoot_active_provider';

export interface APIProvider {
  id: string;
  name: string;
  icon?: string;
}

export interface ProviderInfo {
  provider: string;
  models: string[];
}

export const PROVIDERS: APIProvider[] = [
  {
    id: 'kiro',
    name: 'Kiro (CLI)',
    icon: '/providers/kiro.svg',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '/providers/openai.svg',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '/providers/anthropic.svg',
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '/providers/google.svg',
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    icon: '/providers/custom.svg',
  },
];

class APIKeyService {
  private cache: Map<string, { key: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private tauriInvoke: any = null;

  constructor() {
    // Initialize Tauri invoke if available
    if (isTauri()) {
      import('@tauri-apps/api/core').then(module => {
        this.tauriInvoke = module.invoke;
        console.log('[ApiKeyService] Tauri backend available');
      }).catch(() => {
        console.log('[ApiKeyService] Tauri not available, using localStorage fallback');
      });
    } else {
      console.log('[ApiKeyService] Running in web mode, using localStorage');
    }
  }

  /**
   * Check if Tauri is available
   */
  private async ensureTauri(): Promise<boolean> {
    if (!isTauri()) return false;
    
    // Wait for invoke to be loaded
    if (!this.tauriInvoke) {
      try {
        const module = await import(/* @vite-ignore */ '@tauri-apps/api/core');
        this.tauriInvoke = module.invoke;
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Save an API key for a provider
   */
  async saveKey(provider: string, apiKey: string, isActive: boolean = true): Promise<void> {
    // Clear cache for this provider
    this.cache.delete(provider);

    if (await this.ensureTauri()) {
      try {
        await this.tauriInvoke('save_api_key', { provider, apiKey, isActive });
        console.log(`[ApiKeyService] Saved API key for ${provider} (Tauri)`);
        return;
      } catch (error) {
        console.error(`[ApiKeyService] Tauri save failed, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${provider}`, apiKey);
      if (isActive) {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
      }
      console.log(`[ApiKeyService] Saved API key for ${provider} (localStorage)`);
    } catch (error) {
      console.error(`[ApiKeyService] Failed to save API key:`, error);
      throw new Error(`Failed to save API key: ${error}`);
    }
  }

  /**
   * Load an API key for a provider
   */
  async loadKey(provider: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(provider);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.key;
    }

    if (await this.ensureTauri()) {
      try {
        if (provider === 'kiro') {
          // Special case for Kiro: fetch dynamic token from bridge
          const token = await this.tauriInvoke('get_kiro_token');
          // Don't cache long-term as tokens expire, but short cache is fine
          this.cache.set(provider, { key: token, timestamp: Date.now() });
          return token;
        }
        
        const apiKey = await this.tauriInvoke('load_api_key', { provider });
        this.cache.set(provider, { key: apiKey, timestamp: Date.now() });
        return apiKey;
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri load failed, trying localStorage:`, error);
      }
    }

    // Fallback to localStorage
    const apiKey = localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`);
    }
    
    this.cache.set(provider, { key: apiKey, timestamp: Date.now() });
    return apiKey;
  }

  /**
   * Delete an API key for a provider
   */
  async deleteKey(provider: string): Promise<void> {
    this.cache.delete(provider);

    if (await this.ensureTauri()) {
      try {
        await this.tauriInvoke('delete_api_key', { provider });
        console.log(`[ApiKeyService] Deleted API key for ${provider} (Tauri)`);
        return;
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri delete failed, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
    const activeProvider = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (activeProvider === provider) {
      localStorage.removeItem(ACTIVE_PROVIDER_KEY);
    }
    console.log(`[ApiKeyService] Deleted API key for ${provider} (localStorage)`);
  }

  /**
   * List all configured providers
   */
  async listProviders(): Promise<string[]> {
    if (await this.ensureTauri()) {
      try {
        return await this.tauriInvoke('list_providers');
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri list failed, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    const providers: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        providers.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
    return providers;
  }

  /**
   * Get the active provider
   */
  async getActiveProvider(): Promise<string | null> {
    if (await this.ensureTauri()) {
      try {
        return await this.tauriInvoke('get_active_provider');
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri getActive failed, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    return localStorage.getItem(ACTIVE_PROVIDER_KEY);
  }

  /**
   * Set a provider as active
   */
  async setActiveProvider(provider: string): Promise<void> {
    if (await this.ensureTauri()) {
      try {
        await this.tauriInvoke('set_active_provider', { provider });
        console.log(`[ApiKeyService] Set active provider to ${provider} (Tauri)`);
        return;
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri setActive failed, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
    console.log(`[ApiKeyService] Set active provider to ${provider} (localStorage)`);
  }

  /**
   * Test an API key and fetch available models
   */
  async testKey(provider: string, apiKey: string): Promise<ProviderInfo> {
    if (await this.ensureTauri()) {
      try {
        if (provider === 'kiro') {
          // Verify we can get the token
          const token = await this.tauriInvoke('get_kiro_token');
          if (!token) throw new Error("No Kiro token found");
          
          return {
            provider: 'kiro',
            models: ['kiro-chat-beta', 'claude-3-5-sonnet-20241022']
          };
        }
        
        const providerInfo = await this.tauriInvoke('test_api_key', { provider, apiKey });
        console.log(`[ApiKeyService] API key validated for ${provider}:`, providerInfo);
        return providerInfo;
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri test failed, using direct API test:`, error);
      }
    }

    // Fallback: test directly via API
    return await this.testKeyDirectly(provider, apiKey);
  }

  /**
   * Test API key directly without Tauri backend
   */
  private async testKeyDirectly(provider: string, apiKey: string): Promise<ProviderInfo> {
    try {
      switch (provider) {
        case 'openai': {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (!response.ok) throw new Error('Invalid OpenAI API key');
          const data = await response.json();
          const models = data.data?.map((m: any) => m.id).filter((id: string) => 
            id.includes('gpt') || id.includes('o1')
          ).slice(0, 10) || [];
          return { provider: 'openai', models };
        }
        case 'google': {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          if (!response.ok) throw new Error('Invalid Google API key');
          const data = await response.json();
          const models = data.models?.map((m: any) => m.name.replace('models/', '')).slice(0, 10) || [];
          return { provider: 'google', models };
        }
        case 'anthropic': {
          // Anthropic doesn't have a models endpoint, so we just validate the key format
          if (!apiKey.startsWith('sk-ant-')) {
            throw new Error('Invalid Anthropic API key format');
          }
          return { 
            provider: 'anthropic', 
            models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] 
          };
        }
        case 'kiro': {
          // Kiro auth is handled via CLI bridge, so this is just a mock for web mode
          // In Tauri mode, the backend handles the actual check
          return {
            provider: 'kiro',
            models: ['kiro-chat-beta', 'claude-3-5-sonnet-20241022']
          };
        }
        case 'custom':
          return { provider: 'custom', models: [] };
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`[ApiKeyService] Direct API test failed:`, error);
      throw error;
    }
  }

  /**
   * Fetch available models for a provider (using stored API key)
   */
  async fetchProviderModels(provider: string): Promise<string[]> {
    if (await this.ensureTauri()) {
      try {
        const models = await this.tauriInvoke('fetch_provider_models', { provider });
        console.log(`[ApiKeyService] Fetched ${models.length} models for ${provider}`);
        return models;
      } catch (error) {
        console.warn(`[ApiKeyService] Tauri fetchModels failed:`, error);
      }
    }

    // Fallback: load key and test directly
    try {
      const apiKey = await this.loadKey(provider);
      const info = await this.testKeyDirectly(provider, apiKey);
      return info.models;
    } catch (error) {
      console.error(`[ApiKeyService] Failed to fetch models:`, error);
      throw error;
    }
  }

  /**
   * Check if a provider has a configured API key
   */
  async hasKey(provider: string): Promise<boolean> {
    try {
      await this.loadKey(provider);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save the selected model for a provider
   */
  async saveModel(provider: string, model: string): Promise<void> {
    try {
      localStorage.setItem(`${MODEL_PREFIX}${provider}`, model);
      console.log(`[ApiKeyService] Saved model ${model} for ${provider}`);
    } catch (error) {
      console.error(`[ApiKeyService] Failed to save model:`, error);
      throw new Error(`Failed to save model: ${error}`);
    }
  }

  /**
   * Load the selected model for a provider
   */
  async loadModel(provider: string): Promise<string | null> {
    try {
      const model = localStorage.getItem(`${MODEL_PREFIX}${provider}`);
      return model;
    } catch (error) {
      console.error(`[ApiKeyService] Failed to load model:`, error);
      return null;
    }
  }

  /**
   * Delete the selected model for a provider
   */
  async deleteModel(provider: string): Promise<void> {
    try {
      localStorage.removeItem(`${MODEL_PREFIX}${provider}`);
      console.log(`[ApiKeyService] Deleted model for ${provider}`);
    } catch (error) {
      console.error(`[ApiKeyService] Failed to delete model:`, error);
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get provider info by ID
   */
  getProviderInfo(providerId: string): APIProvider | undefined {
    return PROVIDERS.find(p => p.id === providerId);
  }
}

// Export singleton instance
export const apiKeyService = new APIKeyService();
export default apiKeyService;
