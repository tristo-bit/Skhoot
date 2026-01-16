/**
 * Universal Provider Registry
 * 
 * Manages AI provider configurations with support for:
 * - Known providers (OpenAI, Anthropic, Google)
 * - Custom/local endpoints (Ollama, LM Studio, vLLM, etc.)
 * - Future providers (auto-detection based on API format)
 * 
 * Each provider can have different capabilities:
 * - Tool/function calling support
 * - Streaming support
 * - Vision/multimodal support
 * - Context window size
 */

// ============================================================================
// Types
// ============================================================================

export type APIFormat = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface ModelCapabilities {
  /** Supports function/tool calling */
  toolCalling: boolean;
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports vision/image input */
  vision: boolean;
  /** Supports OCR (Optical Character Recognition) */
  ocr: boolean;
  /** Supports JSON mode output */
  jsonMode: boolean;
  /** Context window size in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  capabilities: ModelCapabilities;
  description?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  /** API format to use for requests */
  apiFormat: APIFormat;
  /** Base URL for API requests */
  baseUrl: string;
  /** Default model if none specified */
  defaultModel: string;
  /** Known models with capabilities */
  models: ModelInfo[];
  /** Whether this is a custom/local provider */
  isCustom: boolean;
  /** Header name for API key (default: Authorization) */
  authHeader?: string;
  /** Auth prefix (default: Bearer) */
  authPrefix?: string;
  /** Additional headers required */
  extraHeaders?: Record<string, string>;
}

// ============================================================================
// Default Model Capabilities
// ============================================================================

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  toolCalling: false,
  streaming: true,
  vision: false,
  ocr: false,
  jsonMode: false,
  contextWindow: 4096,
  maxOutputTokens: 4096,
};

const TOOL_CALLING_CAPABILITIES: ModelCapabilities = {
  ...DEFAULT_CAPABILITIES,
  toolCalling: true,
  jsonMode: true,
};

// ============================================================================
// Known Provider Configurations
// ============================================================================

const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 16384 },
    description: 'Most capable model, multimodal with vision',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 16384 },
    description: 'Fast and affordable, great for most tasks',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 4096 },
    description: 'Previous flagship with vision',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 16385, maxOutputTokens: 4096 },
    description: 'Fast and cost-effective',
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    capabilities: { ...DEFAULT_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 32768 },
    description: 'Reasoning model (no tool calling)',
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    capabilities: { ...DEFAULT_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 65536 },
    description: 'Fast reasoning model (no tool calling)',
  },
];

const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 200000, maxOutputTokens: 8192 },
    description: 'Best balance of intelligence and speed',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 200000, maxOutputTokens: 4096 },
    description: 'Most powerful for complex tasks',
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 200000, maxOutputTokens: 4096 },
    description: 'Fastest and most compact',
  },
];

const GOOGLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 1000000, maxOutputTokens: 8192 },
    description: 'Latest and fastest Gemini model',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 2000000, maxOutputTokens: 8192 },
    description: 'Largest context window available',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 1000000, maxOutputTokens: 8192 },
    description: 'Fast and efficient',
  },
];

// Common local/open-source models
const LOCAL_MODELS: ModelInfo[] = [
  {
    id: 'llama3.1',
    name: 'Llama 3.1',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 4096 },
    description: 'Meta Llama 3.1 with tool calling',
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 4096 },
    description: 'Meta Llama 3.2 with vision',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 32000, maxOutputTokens: 4096 },
    description: 'Mistral AI model',
  },
  {
    id: 'mixtral',
    name: 'Mixtral',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 32000, maxOutputTokens: 4096 },
    description: 'Mixtral MoE model',
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    capabilities: { ...DEFAULT_CAPABILITIES, contextWindow: 16000, maxOutputTokens: 4096 },
    description: 'Optimized for code (limited tool calling)',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, contextWindow: 64000, maxOutputTokens: 4096 },
    description: 'DeepSeek coding model',
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    capabilities: { ...TOOL_CALLING_CAPABILITIES, contextWindow: 128000, maxOutputTokens: 8192 },
    description: 'Alibaba Qwen 2.5',
  },
];

// ============================================================================
// Known Providers
// ============================================================================

export const KNOWN_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: OPENAI_MODELS,
    isCustom: false,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    apiFormat: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ANTHROPIC_MODELS,
    isCustom: false,
    extraHeaders: {
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  },
  google: {
    id: 'google',
    name: 'Google AI',
    apiFormat: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: GOOGLE_MODELS,
    isCustom: false,
    authHeader: 'x-goog-api-key',
    authPrefix: '',
  },
  custom: {
    id: 'custom',
    name: 'Custom Endpoint',
    apiFormat: 'openai', // Default to OpenAI-compatible
    baseUrl: '',
    defaultModel: '',
    models: LOCAL_MODELS,
    isCustom: true,
  },
};

// ============================================================================
// Provider Registry Class
// ============================================================================

class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();
  private customEndpoints: Map<string, string> = new Map();

  constructor() {
    // Initialize with known providers
    Object.values(KNOWN_PROVIDERS).forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  /**
   * Get a provider configuration
   */
  getProvider(providerId: string): ProviderConfig | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get model info for a specific model
   */
  getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
    const provider = this.providers.get(providerId);
    if (!provider) return undefined;

    // Try exact match first
    let model = provider.models.find(m => m.id === modelId);
    if (model) return model;

    // Try partial match (for versioned models like gpt-4o-2024-08-06)
    model = provider.models.find(m => modelId.startsWith(m.id) || m.id.startsWith(modelId));
    if (model) return model;

    // Return default capabilities for unknown models
    return {
      id: modelId,
      name: modelId,
      capabilities: this.inferCapabilities(providerId, modelId),
      description: 'Unknown model - capabilities inferred',
    };
  }

  /**
   * Infer capabilities for unknown models based on provider and model name
   */
  inferCapabilities(providerId: string, modelId: string): ModelCapabilities {
    const modelLower = modelId.toLowerCase();

    // Check for known patterns that indicate tool calling support
    const hasToolCalling = 
      // OpenAI models with tool calling
      modelLower.includes('gpt-4') ||
      modelLower.includes('gpt-3.5-turbo') ||
      // Anthropic Claude 3+
      modelLower.includes('claude-3') ||
      // Google Gemini
      modelLower.includes('gemini') ||
      // Llama 3.1+ has tool calling
      modelLower.includes('llama3.1') ||
      modelLower.includes('llama3.2') ||
      modelLower.includes('llama-3.1') ||
      modelLower.includes('llama-3.2') ||
      // Mistral/Mixtral
      modelLower.includes('mistral') ||
      modelLower.includes('mixtral') ||
      // Qwen
      modelLower.includes('qwen') ||
      // DeepSeek
      modelLower.includes('deepseek') ||
      // Generic function/tool indicators
      modelLower.includes('function') ||
      modelLower.includes('tool');

    // Check for vision support
    const hasVision =
      modelLower.includes('vision') ||
      modelLower.includes('4o') ||
      modelLower.includes('gemini') ||
      modelLower.includes('claude-3') ||
      modelLower.includes('llama3.2');

    // Infer context window
    let contextWindow = 4096;
    if (modelLower.includes('128k') || modelLower.includes('llama3')) contextWindow = 128000;
    else if (modelLower.includes('32k')) contextWindow = 32768;
    else if (modelLower.includes('16k')) contextWindow = 16384;
    else if (modelLower.includes('gemini')) contextWindow = 1000000;
    else if (modelLower.includes('claude')) contextWindow = 200000;

    return {
      toolCalling: hasToolCalling,
      streaming: true,
      vision: hasVision,
      jsonMode: hasToolCalling,
      contextWindow,
      maxOutputTokens: 4096,
    };
  }

  /**
   * Check if a model supports tool calling
   */
  supportsToolCalling(providerId: string, modelId: string): boolean {
    const modelInfo = this.getModelInfo(providerId, modelId);
    return modelInfo?.capabilities.toolCalling ?? false;
  }

  /**
   * Set custom endpoint URL
   */
  setCustomEndpoint(providerId: string, url: string): void {
    this.customEndpoints.set(providerId, url);
    
    // Update provider config if it's the custom provider
    const provider = this.providers.get(providerId);
    if (provider?.isCustom) {
      provider.baseUrl = url;
    }
  }

  /**
   * Get the base URL for a provider
   */
  getBaseUrl(providerId: string): string {
    const customUrl = this.customEndpoints.get(providerId);
    if (customUrl) return customUrl;

    const provider = this.providers.get(providerId);
    return provider?.baseUrl || '';
  }

  /**
   * Get the API format for a provider
   */
  getApiFormat(providerId: string): APIFormat {
    const provider = this.providers.get(providerId);
    return provider?.apiFormat || 'openai';
  }

  /**
   * Detect API format from endpoint URL
   */
  detectApiFormat(url: string): APIFormat {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('anthropic')) return 'anthropic';
    if (urlLower.includes('googleapis') || urlLower.includes('generativelanguage')) return 'google';
    if (urlLower.includes('ollama') || urlLower.includes(':11434')) return 'ollama';
    
    // Default to OpenAI-compatible (most common for local endpoints)
    return 'openai';
  }

  /**
   * Register a new custom provider
   */
  registerCustomProvider(config: Partial<ProviderConfig> & { id: string; baseUrl: string }): void {
    const apiFormat = config.apiFormat || this.detectApiFormat(config.baseUrl);
    
    const provider: ProviderConfig = {
      id: config.id,
      name: config.name || config.id,
      apiFormat,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel || '',
      models: config.models || LOCAL_MODELS,
      isCustom: true,
      authHeader: config.authHeader,
      authPrefix: config.authPrefix,
      extraHeaders: config.extraHeaders,
    };

    this.providers.set(config.id, provider);
  }

  /**
   * Get auth headers for a provider
   */
  getAuthHeaders(providerId: string, apiKey: string): Record<string, string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { 'Authorization': `Bearer ${apiKey}` };
    }

    const headers: Record<string, string> = {};
    
    // Add auth header
    const authHeader = provider.authHeader || 'Authorization';
    const authPrefix = provider.authPrefix ?? 'Bearer';
    headers[authHeader] = authPrefix ? `${authPrefix} ${apiKey}` : apiKey;

    // Add extra headers
    if (provider.extraHeaders) {
      Object.assign(headers, provider.extraHeaders);
    }

    return headers;
  }

  /**
   * Get model capabilities summary for display
   */
  getCapabilitiesSummary(capabilities: ModelCapabilities): string[] {
    const summary: string[] = [];
    
    if (capabilities.toolCalling) summary.push('🔧 Tool Calling');
    if (capabilities.vision) summary.push('👁️ Vision');
    if (capabilities.streaming) summary.push('⚡ Streaming');
    if (capabilities.jsonMode) summary.push('📋 JSON Mode');
    
    summary.push(`📝 ${formatContextWindow(capabilities.contextWindow)} context`);
    
    return summary;
  }
}

// Helper function to format context window
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return `${tokens}`;
}

// Export singleton
export const providerRegistry = new ProviderRegistry();
