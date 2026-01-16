/**
 * Token Tracking Service
 * 
 * Two tracking modes:
 * 1. Conversation tokens - resets on new chat, shown in PromptArea
 * 2. Historical tokens - persisted with timestamps, shown in AI Settings with date filters
 */

// Token pricing per 1M tokens (in USD) - Updated January 2026
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-vision-preview': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Google Gemini
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  
  // Anthropic Claude
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  
  // Default for unknown models
  'default': { input: 1.00, output: 3.00 },
};

const TOKENS_PER_CHAR = 0.25;

// ============================================================================
// Types
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/** Single usage record with timestamp for historical tracking */
export interface TokenRecord {
  timestamp: Date;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

/** Conversation token stats (resets on new chat) */
export interface ConversationTokens {
  model: string;
  provider: string;
  totalSpent: number; // Total tokens spent in this conversation
  cost: number;
}

/** Event sent to listeners */
export interface TokenUpdateEvent {
  conversationTokens: ConversationTokens;
  lastRecord: TokenRecord | null;
}

/** Time period filter for AI Settings */
export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'all';

type TokenUpdateCallback = (event: TokenUpdateEvent) => void;

// ============================================================================
// Service
// ============================================================================

class TokenTrackingService {
  // Current conversation tracking
  private conversationTokens: ConversationTokens = {
    model: '',
    provider: '',
    totalSpent: 0,
    cost: 0,
  };
  
  // Historical records (persisted)
  private history: TokenRecord[] = [];
  
  // Current model info
  private currentModel: string = '';
  private currentProvider: string = '';
  
  // Listeners
  private listeners: Set<TokenUpdateCallback> = new Set();
  
  constructor() {
    this.loadHistory();
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  /**
   * Set current model/provider
   */
  setCurrentModel(provider: string, model: string): void {
    this.currentProvider = provider;
    this.currentModel = model;
    this.conversationTokens.model = model;
    this.conversationTokens.provider = provider;
  }
  
  /**
   * Record token usage - updates both conversation and history
   */
  recordUsage(
    inputTokens: number, 
    outputTokens: number, 
    model?: string, 
    provider?: string,
    inputText?: string,
    outputText?: string
  ): void {
    const useModel = model || this.currentModel;
    const useProvider = provider || this.currentProvider;
    
    if (!useModel || !useProvider) {
      console.warn('[TokenTracking] No model/provider set');
      return;
    }
    
    // Estimate if needed
    let finalInput = inputTokens;
    let finalOutput = outputTokens;
    
    if (finalInput === 0 && inputText) {
      finalInput = this.estimateTokens(inputText);
    }
    if (finalOutput === 0 && outputText) {
      finalOutput = this.estimateTokens(outputText);
    }
    
    const total = finalInput + finalOutput;
    const cost = this.calculateCost(useModel, finalInput, finalOutput);
    
    // Update conversation tokens
    this.conversationTokens.model = useModel;
    this.conversationTokens.provider = useProvider;
    this.conversationTokens.totalSpent += total;
    this.conversationTokens.cost += cost;
    
    // Add to history
    const record: TokenRecord = {
      timestamp: new Date(),
      model: useModel,
      provider: useProvider,
      inputTokens: finalInput,
      outputTokens: finalOutput,
      totalTokens: total,
      cost,
    };
    this.history.push(record);
    this.saveHistory();
    
    // Notify
    this.notifyListeners(record);
    
    console.log(`[TokenTracking] +${total} tokens (conversation: ${this.conversationTokens.totalSpent})`);
  }
  
  /**
   * Reset conversation tokens (called on New Chat)
   */
  resetConversation(): void {
    this.conversationTokens = {
      model: this.currentModel,
      provider: this.currentProvider,
      totalSpent: 0,
      cost: 0,
    };
    this.notifyListeners(null);
    console.log('[TokenTracking] Conversation reset');
  }
  
  /**
   * Get current conversation tokens
   */
  getConversationTokens(): ConversationTokens {
    return { ...this.conversationTokens };
  }
  
  /**
   * Get historical usage filtered by time period
   */
  getHistoricalUsage(period: TimePeriod = 'month'): { 
    inputTokens: number; 
    outputTokens: number; 
    totalTokens: number;
    cost: number;
    records: TokenRecord[];
  } {
    const now = new Date();
    const filtered = this.history.filter(r => {
      const recordDate = new Date(r.timestamp);
      switch (period) {
        case 'hour':
          return now.getTime() - recordDate.getTime() < 60 * 60 * 1000;
        case 'day':
          return now.getTime() - recordDate.getTime() < 24 * 60 * 60 * 1000;
        case 'week':
          return now.getTime() - recordDate.getTime() < 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return now.getTime() - recordDate.getTime() < 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
          return true;
      }
    });
    
    const totals = filtered.reduce((acc, r) => ({
      inputTokens: acc.inputTokens + r.inputTokens,
      outputTokens: acc.outputTokens + r.outputTokens,
      totalTokens: acc.totalTokens + r.totalTokens,
      cost: acc.cost + r.cost,
    }), { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 });
    
    return { ...totals, records: filtered };
  }
  
  /**
   * Subscribe to updates
   */
  subscribe(callback: TokenUpdateCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Clear all history (for settings)
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }
  
  // ==========================================================================
  // Helpers
  // ==========================================================================
  
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length * TOKENS_PER_CHAR);
  }
  
  private calculateCost(model: string, input: number, output: number): number {
    let pricing = TOKEN_PRICING['default'];
    for (const [key, p] of Object.entries(TOKEN_PRICING)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        pricing = p;
        break;
      }
    }
    return (input / 1_000_000) * pricing.input + (output / 1_000_000) * pricing.output;
  }
  
  private notifyListeners(lastRecord: TokenRecord | null): void {
    const event: TokenUpdateEvent = {
      conversationTokens: { ...this.conversationTokens },
      lastRecord,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[TokenTracking] Listener error:', e);
      }
    }
  }
  
  private saveHistory(): void {
    try {
      // Keep last 1000 records max
      if (this.history.length > 1000) {
        this.history = this.history.slice(-1000);
      }
      localStorage.setItem('skhoot_token_history', JSON.stringify(this.history));
    } catch (e) {
      console.error('[TokenTracking] Save error:', e);
    }
  }
  
  private loadHistory(): void {
    try {
      const data = localStorage.getItem('skhoot_token_history');
      if (data) {
        this.history = JSON.parse(data).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }));
      }
    } catch (e) {
      console.error('[TokenTracking] Load error:', e);
    }
  }
  
  // ==========================================================================
  // Static formatters
  // ==========================================================================
  
  static formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  }
  
  static formatCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  }
}

export const tokenTrackingService = new TokenTrackingService();
