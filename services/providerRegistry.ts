/**
 * Universal Provider Registry
 * 
 * Manages AI provider configurations and adapters for OpenAI, Anthropic, and Google Gemini.
 */

// ============================================================================
// Types
// ============================================================================

export type APIFormat = 'openai' | 'anthropic' | 'google' | 'ollama' | 'kiro';

export interface ModelCapabilities {
  toolCalling: boolean;
  streaming: boolean;
  vision: boolean;
  ocr: boolean;
  jsonMode: boolean;
  contextWindow: number;
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
  apiFormat: APIFormat;
  baseUrl: string;
  defaultModel: string;
  models: ModelInfo[];
  isCustom: boolean;
  authHeader?: string;
  authPrefix?: string;
  extraHeaders?: Record<string, string>;
}

// ============================================================================
// Constants & Models
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

const OPENAI_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 16384 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 128000, maxOutputTokens: 16384 } },
  { id: 'o1', name: 'O1', capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 32768 } },
  { id: 'o1-mini', name: 'O1 Mini', capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 65536 } },
  { id: 'o3-mini', name: 'O3 Mini', capabilities: { ...TOOL_CALLING_CAPABILITIES, ocr: false, contextWindow: 128000, maxOutputTokens: 65536 } },
];

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 200000, maxOutputTokens: 8192 } },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: false, ocr: false, contextWindow: 200000, maxOutputTokens: 8192 } },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 200000, maxOutputTokens: 4096 } },
];

const GOOGLE_MODELS: ModelInfo[] = [
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 2000000, maxOutputTokens: 8192 } },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 1000000, maxOutputTokens: 8192 } },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 1000000, maxOutputTokens: 8192 } },
  { id: 'gemini-2.0-flash-thinking-preview', name: 'Gemini 2.0 Flash (Thinking)', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 1000000, maxOutputTokens: 8192 } },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', capabilities: { ...TOOL_CALLING_CAPABILITIES, vision: true, ocr: true, contextWindow: 2000000, maxOutputTokens: 8192 } },
];

export const KNOWN_PROVIDERS: Record<string, ProviderConfig> = {
  openai: { id: 'openai', name: 'OpenAI', apiFormat: 'openai', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: OPENAI_MODELS, isCustom: false },
  anthropic: { id: 'anthropic', name: 'Anthropic', apiFormat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-20241022', models: ANTHROPIC_MODELS, isCustom: false, extraHeaders: { 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } },
  google: { id: 'google', name: 'Google AI', apiFormat: 'google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.0-flash', models: GOOGLE_MODELS, isCustom: false, authHeader: 'x-goog-api-key', authPrefix: '' },
  kiro: { id: 'kiro', name: 'Kiro (CLI)', apiFormat: 'openai', baseUrl: 'https://api.kiro.dev/v1', defaultModel: 'kiro-chat-beta', models: [], isCustom: false },
  custom: { id: 'custom', name: 'Custom Endpoint', apiFormat: 'openai', baseUrl: '', defaultModel: '', models: [], isCustom: true },
};

import { AgentChatMessage, AgentChatResponse, AgentToolCall } from './agent/types';

// ============================================================================
// Provider Registry Class
// ============================================================================

class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();
  private customEndpoints: Map<string, string> = new Map();

  constructor() {
    Object.values(KNOWN_PROVIDERS).forEach(p => this.providers.set(p.id, p));
  }

  async chat(
    providerId: string,
    model: string,
    apiKey: string,
    message: string,
    history: AgentChatMessage[],
    systemPrompt: string,
    tools?: any[],
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
  ): Promise<AgentChatResponse> {
    const apiFormat = this.getApiFormat(providerId);
    const baseUrl = this.getBaseUrl(providerId);
    
    switch (apiFormat) {
      case 'openai':
      case 'kiro':
        return this.chatOpenAI(baseUrl, apiKey, model, message, history, systemPrompt, tools, images);
      case 'anthropic':
        return this.chatAnthropic(baseUrl, apiKey, model, message, history, systemPrompt, tools, images);
      case 'google':
        return this.chatGoogle(baseUrl, apiKey, model, message, history, systemPrompt, tools, images);
      default:
        throw new Error(`Unsupported API format: ${apiFormat}`);
    }
  }

  // --- OpenAI Adapter ---
  private async chatOpenAI(baseUrl: string, apiKey: string, model: string, message: string, history: AgentChatMessage[], systemPrompt: string, tools?: any[], images?: any[]): Promise<AgentChatResponse> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => {
        if (msg.role === 'tool') return { role: 'tool', tool_call_id: msg.toolCallId, content: msg.content };
        if (msg.toolCalls) return { role: 'assistant', content: msg.content || null, tool_calls: msg.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })) };
        return { role: msg.role, content: msg.content };
      })
    ];

    if (message || history.length === 0) {
      if (images && images.length > 0) {
        const content: any[] = [{ type: 'text', text: message || '' }];
        images.forEach(img => content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }));
        messages.push({ role: 'user', content: content as any });
      } else {
        messages.push({ role: 'user', content: message || '' });
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools, tool_choice: tools ? 'auto' : undefined, stream: false })
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    const choice = data.choices[0];
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls?.map((tc: any) => ({ id: tc.id, name: tc.function.name, arguments: JSON.parse(tc.function.arguments) })),
      isComplete: choice.finish_reason !== 'length',
      provider: 'openai', model, capabilities: this.inferCapabilities('openai', model)
    };
  }

  // --- Anthropic Adapter ---
  private async chatAnthropic(baseUrl: string, apiKey: string, model: string, message: string, history: AgentChatMessage[], systemPrompt: string, tools?: any[], images?: any[]): Promise<AgentChatResponse> {
    const messages = history.filter(msg => msg.role !== 'system').map(msg => {
      if (msg.role === 'tool') return { role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }] };
      if (msg.toolCalls) return { role: 'assistant', content: [...(msg.content ? [{ type: 'text', text: msg.content }] : []), ...msg.toolCalls.map(tc => ({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments }))] };
      return { role: msg.role, content: msg.content };
    });

    if (message || history.length === 0) {
      if (images && images.length > 0) {
        const content: any[] = images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } }));
        content.push({ type: 'text', text: message || '' });
        messages.push({ role: 'user', content: content as any });
      } else {
        messages.push({ role: 'user', content: message || '' });
      }
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, messages, system: systemPrompt, tools, max_tokens: 4096, stream: false })
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return {
      content: data.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n'),
      toolCalls: data.content.filter((c: any) => c.type === 'tool_use').map((c: any) => ({ id: c.id, name: c.name, arguments: c.input })),
      isComplete: data.stop_reason !== 'max_tokens',
      provider: 'anthropic', model, capabilities: this.inferCapabilities('anthropic', model)
    };
  }

  // --- Google Gemini Adapter ---
  private async chatGoogle(baseUrl: string, apiKey: string, model: string, message: string, history: AgentChatMessage[], systemPrompt: string, tools?: any[], images?: any[]): Promise<AgentChatResponse> {
    const contents: any[] = [];
    let i = 0;
    while (i < history.length) {
      const msg = history[i];
      if (msg.role === 'system') { i++; continue; }

      if (msg.role === 'tool' || (msg.toolResults && msg.toolResults.length > 0)) {
        const parts: any[] = [];
        const processMsg = (m: AgentChatMessage) => {
          const results = m.toolResults || [{ toolCallName: m.toolCallName, output: m.content, thought_signature: m.thought_signature }];
          results.forEach(tr => {
            const part: any = { functionResponse: { name: tr.toolCallName || 'unknown_tool', response: { content: tr.output } } };
            if (tr.thought_signature) part.thought_signature = tr.thought_signature;
            parts.push(part);
          });
        };
        processMsg(msg);
        while (i + 1 < history.length && (history[i + 1].role === 'tool' || history[i+1].toolResults?.length)) { i++; processMsg(history[i]); }
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.thought) {
          const thoughtPart: any = { thought: msg.thought };
          if (msg.thought_signature) thoughtPart.thought_signature = msg.thought_signature;
          parts.push(thoughtPart);
        }
        if (msg.toolCalls) msg.toolCalls.forEach(tc => {
          const p: any = { functionCall: { name: tc.name, args: tc.arguments } };
          if (tc.thought_signature) p.thought_signature = tc.thought_signature;
          parts.push(p);
        });
        if (parts.length > 0) contents.push({ role: 'model', parts });
      } else {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      }
      i++;
    }

    if (message || contents.length === 0) {
      const parts: any[] = [{ text: message || '' }];
      if (images) images.forEach(img => parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
      contents.push({ role: 'user', parts });
    }

    const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }, tools })
    });

    if (!response.ok) throw new Error(`Google API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    const candidate = data.candidates?.[0];
    const resParts = candidate?.content?.parts || [];
    
    // Fix Gemini 3: Extract thought signature from ANY part that has it (FC or Thought)
    const rawThoughtPart = resParts.find((p: any) => p.thought);
    const mainThoughtSignature = resParts.find((p: any) => p.thought_signature || p.thoughtSignature)?.thought_signature || resParts.find((p: any) => p.thought_signature || p.thoughtSignature)?.thoughtSignature;

    const toolCalls = resParts.filter((p: any) => p.functionCall).map((p: any, idx: number) => {
      const tc = {
        id: `call_${Date.now()}_${idx}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args,
        // Gemini 3 requirement: signature MUST be on the first FC part if parallel
        thought_signature: idx === 0 ? (p.thought_signature || p.thoughtSignature || mainThoughtSignature) : undefined
      };
      // If we still have no signature but the documentation says it's required for Gemini 3,
      // provide the official bypass signature to prevent the 400 error.
      if (idx === 0 && !tc.thought_signature && (model.includes('gemini-3') || model.includes('gemini-2.5'))) {
        tc.thought_signature = 'context_engineering_is_the_way_to_go';
      }
      return tc;
    });

    return {
      content: resParts.filter((p: any) => p.text).map((p: any) => p.text).join('\n'),
      thought: rawThoughtPart?.thought,
      thought_signature: mainThoughtSignature,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      isComplete: candidate?.finishReason !== 'MAX_TOKENS',
      provider: 'google', model, capabilities: this.inferCapabilities('google', model)
    };
  }

  // --- Helpers ---
  getProvider(id: string) { return this.providers.get(id); }
  getAllProviders() { return Array.from(this.providers.values()); }
  getBaseUrl(id: string) { return this.customEndpoints.get(id) || this.providers.get(id)?.baseUrl || ''; }
  getApiFormat(id: string) { return this.providers.get(id)?.apiFormat || 'openai'; }
  setCustomEndpoint(id: string, url: string) { this.customEndpoints.set(id, url); if (this.providers.get(id)?.isCustom) this.providers.get(id)!.baseUrl = url; }

  getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
    const p = this.providers.get(providerId);
    if (!p) return undefined;
    const m = p.models.find(m => m.id === modelId) || p.models.find(m => modelId.startsWith(m.id));
    return m || { id: modelId, name: modelId, capabilities: this.inferCapabilities(providerId, modelId), description: 'Inferred capabilities' };
  }

  inferCapabilities(providerId: string, modelId: string): ModelCapabilities {
    const low = modelId.toLowerCase();
    const hasTool = low.includes('gpt-4') || low.includes('o1') || low.includes('o3') || low.includes('claude-3') || low.includes('gemini') || low.includes('llama3');
    const hasVision = low.includes('vision') || low.includes('4o') || low.includes('gemini') || low.includes('claude-3');
    return {
      toolCalling: hasTool, streaming: true, vision: hasVision, ocr: hasVision, jsonMode: hasTool,
      contextWindow: low.includes('gemini') ? 1000000 : (low.includes('claude') ? 200000 : 128000),
      maxOutputTokens: 4096
    };
  }
}

export const providerRegistry = new ProviderRegistry();
