/**
 * Model Capabilities Configuration
 * Defines max output tokens and other capabilities for each AI model
 */

export interface ModelCapability {
  maxOutputTokens: number;
  displayName: string;
  provider: 'openai' | 'google' | 'anthropic' | 'custom';
}

// Model-specific max output token limits
export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  // OpenAI Models
  'gpt-4o': {
    maxOutputTokens: 16384,
    displayName: 'GPT-4o',
    provider: 'openai',
  },
  'gpt-4o-mini': {
    maxOutputTokens: 16384,
    displayName: 'GPT-4o Mini',
    provider: 'openai',
  },
  'o1': {
    maxOutputTokens: 32768,
    displayName: 'O1',
    provider: 'openai',
  },
  'o1-mini': {
    maxOutputTokens: 65536,
    displayName: 'O1 Mini',
    provider: 'openai',
  },
  'o3-mini': {
    maxOutputTokens: 65536,
    displayName: 'O3 Mini',
    provider: 'openai',
  },
  'gpt-4-turbo': {
    maxOutputTokens: 4096,
    displayName: 'GPT-4 Turbo',
    provider: 'openai',
  },
  'gpt-4-turbo-preview': {
    maxOutputTokens: 4096,
    displayName: 'GPT-4 Turbo Preview',
    provider: 'openai',
  },
  'gpt-4': {
    maxOutputTokens: 8192,
    displayName: 'GPT-4',
    provider: 'openai',
  },
  'gpt-3.5-turbo': {
    maxOutputTokens: 4096,
    displayName: 'GPT-3.5 Turbo',
    provider: 'openai',
  },
  'gpt-3.5-turbo-16k': {
    maxOutputTokens: 16384,
    displayName: 'GPT-3.5 Turbo 16k',
    provider: 'openai',
  },

  // Google Gemini Models
  'gemini-2.0-flash': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 2.0 Flash',
    provider: 'google',
  },
  'gemini-2.0-flash-thinking-preview': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 2.0 Flash (Thinking)',
    provider: 'google',
  },
  'gemini-2.0-pro-exp-02-05': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 2.0 Pro (Experimental)',
    provider: 'google',
  },
  'gemini-1.5-pro': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 1.5 Pro',
    provider: 'google',
  },
  'gemini-1.5-pro-latest': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 1.5 Pro Latest',
    provider: 'google',
  },
  'gemini-1.5-flash': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 1.5 Flash',
    provider: 'google',
  },
  'gemini-1.5-flash-latest': {
    maxOutputTokens: 8192,
    displayName: 'Gemini 1.5 Flash Latest',
    provider: 'google',
  },
  'gemini-pro': {
    maxOutputTokens: 2048,
    displayName: 'Gemini Pro',
    provider: 'google',
  },

  // Anthropic Claude Models
  'claude-3-5-sonnet-20241022': {
    maxOutputTokens: 8192,
    displayName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
  },
  'claude-3-5-haiku-20241022': {
    maxOutputTokens: 8192,
    displayName: 'Claude 3.5 Haiku',
    provider: 'anthropic',
  },
  'claude-3-5-sonnet-latest': {
    maxOutputTokens: 8192,
    displayName: 'Claude 3.5 Sonnet Latest',
    provider: 'anthropic',
  },
  'claude-3-opus-20240229': {
    maxOutputTokens: 4096,
    displayName: 'Claude 3 Opus',
    provider: 'anthropic',
  },
  'claude-3-sonnet-20240229': {
    maxOutputTokens: 4096,
    displayName: 'Claude 3 Sonnet',
    provider: 'anthropic',
  },
  'claude-3-haiku-20240307': {
    maxOutputTokens: 4096,
    displayName: 'Claude 3 Haiku',
    provider: 'anthropic',
  },
  'claude-2.1': {
    maxOutputTokens: 4096,
    displayName: 'Claude 2.1',
    provider: 'anthropic',
  },
  'claude-2.0': {
    maxOutputTokens: 4096,
    displayName: 'Claude 2.0',
    provider: 'anthropic',
  },
};

// Default max tokens by provider (fallback when model not found)
export const PROVIDER_DEFAULT_MAX_TOKENS: Record<string, number> = {
  openai: 16384,
  google: 8192,
  anthropic: 8192,
  custom: 16384,
};

/**
 * Get max output tokens for a specific model
 */
export function getMaxOutputTokens(model: string, provider?: string): number {
  // Try to find exact model match
  const capability = MODEL_CAPABILITIES[model];
  if (capability) {
    return capability.maxOutputTokens;
  }

  // Fallback to provider default
  if (provider && PROVIDER_DEFAULT_MAX_TOKENS[provider]) {
    return PROVIDER_DEFAULT_MAX_TOKENS[provider];
  }

  // Ultimate fallback
  return 16384;
}

/**
 * Get display name for a model
 */
export function getModelDisplayName(model: string): string {
  return MODEL_CAPABILITIES[model]?.displayName || model;
}

/**
 * Check if a model supports a specific max tokens value
 */
export function isMaxTokensSupported(model: string, maxTokens: number, provider?: string): boolean {
  const modelMax = getMaxOutputTokens(model, provider);
  return maxTokens <= modelMax;
}

/**
 * Get recommended max tokens for a model (80% of max for safety)
 */
export function getRecommendedMaxTokens(model: string, provider?: string): number {
  const max = getMaxOutputTokens(model, provider);
  return Math.floor(max * 0.8);
}
