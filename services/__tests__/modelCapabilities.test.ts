import { describe, it, expect } from 'vitest';
import {
  getMaxOutputTokens,
  getModelDisplayName,
  isMaxTokensSupported,
  getRecommendedMaxTokens,
  MODEL_CAPABILITIES,
  PROVIDER_DEFAULT_MAX_TOKENS,
} from '../modelCapabilities';

describe('modelCapabilities', () => {
  describe('getMaxOutputTokens', () => {
    it('should return correct max tokens for known OpenAI models', () => {
      expect(getMaxOutputTokens('gpt-4o')).toBe(16384);
      expect(getMaxOutputTokens('gpt-4o-mini')).toBe(16384);
      expect(getMaxOutputTokens('gpt-4-turbo')).toBe(4096);
      expect(getMaxOutputTokens('gpt-3.5-turbo')).toBe(4096);
    });

    it('should return correct max tokens for known Google models', () => {
      expect(getMaxOutputTokens('gemini-2.0-flash')).toBe(8192);
      expect(getMaxOutputTokens('gemini-1.5-pro')).toBe(8192);
      expect(getMaxOutputTokens('gemini-1.5-flash')).toBe(8192);
    });

    it('should return correct max tokens for known Anthropic models', () => {
      expect(getMaxOutputTokens('claude-3-5-sonnet-20241022')).toBe(8192);
      expect(getMaxOutputTokens('claude-3-opus-20240229')).toBe(4096);
      expect(getMaxOutputTokens('claude-3-haiku-20240307')).toBe(4096);
    });

    it('should fallback to provider default for unknown models', () => {
      expect(getMaxOutputTokens('unknown-model', 'openai')).toBe(16384);
      expect(getMaxOutputTokens('unknown-model', 'google')).toBe(8192);
      expect(getMaxOutputTokens('unknown-model', 'anthropic')).toBe(8192);
      expect(getMaxOutputTokens('unknown-model', 'custom')).toBe(16384);
    });

    it('should fallback to 16384 for completely unknown model and provider', () => {
      expect(getMaxOutputTokens('unknown-model')).toBe(16384);
    });
  });

  describe('getModelDisplayName', () => {
    it('should return display name for known models', () => {
      expect(getModelDisplayName('gpt-4o')).toBe('GPT-4o');
      expect(getModelDisplayName('gemini-2.0-flash')).toBe('Gemini 2.0 Flash');
      expect(getModelDisplayName('claude-3-5-sonnet-20241022')).toBe('Claude 3.5 Sonnet');
    });

    it('should return model ID for unknown models', () => {
      expect(getModelDisplayName('unknown-model')).toBe('unknown-model');
    });
  });

  describe('isMaxTokensSupported', () => {
    it('should return true when tokens are within model limit', () => {
      expect(isMaxTokensSupported('gpt-4o', 8192)).toBe(true);
      expect(isMaxTokensSupported('gpt-4o', 16384)).toBe(true);
      expect(isMaxTokensSupported('gemini-2.0-flash', 4096)).toBe(true);
    });

    it('should return false when tokens exceed model limit', () => {
      expect(isMaxTokensSupported('gpt-4o', 20000)).toBe(false);
      expect(isMaxTokensSupported('gpt-3.5-turbo', 8192)).toBe(false);
      expect(isMaxTokensSupported('gemini-2.0-flash', 16384)).toBe(false);
    });

    it('should use provider fallback for unknown models', () => {
      expect(isMaxTokensSupported('unknown-model', 8192, 'openai')).toBe(true);
      expect(isMaxTokensSupported('unknown-model', 20000, 'openai')).toBe(false);
    });
  });

  describe('getRecommendedMaxTokens', () => {
    it('should return 80% of max tokens', () => {
      expect(getRecommendedMaxTokens('gpt-4o')).toBe(13107); // 80% of 16384
      expect(getRecommendedMaxTokens('gemini-2.0-flash')).toBe(6553); // 80% of 8192
      expect(getRecommendedMaxTokens('gpt-3.5-turbo')).toBe(3276); // 80% of 4096
    });

    it('should work with provider fallback', () => {
      expect(getRecommendedMaxTokens('unknown-model', 'openai')).toBe(13107); // 80% of 16384
    });
  });

  describe('MODEL_CAPABILITIES', () => {
    it('should have entries for all major models', () => {
      expect(MODEL_CAPABILITIES['gpt-4o']).toBeDefined();
      expect(MODEL_CAPABILITIES['gemini-2.0-flash']).toBeDefined();
      expect(MODEL_CAPABILITIES['claude-3-5-sonnet-20241022']).toBeDefined();
    });

    it('should have correct structure for each model', () => {
      const model = MODEL_CAPABILITIES['gpt-4o'];
      expect(model).toHaveProperty('maxOutputTokens');
      expect(model).toHaveProperty('displayName');
      expect(model).toHaveProperty('provider');
      expect(typeof model.maxOutputTokens).toBe('number');
      expect(typeof model.displayName).toBe('string');
    });
  });

  describe('PROVIDER_DEFAULT_MAX_TOKENS', () => {
    it('should have defaults for all providers', () => {
      expect(PROVIDER_DEFAULT_MAX_TOKENS.openai).toBe(16384);
      expect(PROVIDER_DEFAULT_MAX_TOKENS.google).toBe(8192);
      expect(PROVIDER_DEFAULT_MAX_TOKENS.anthropic).toBe(8192);
      expect(PROVIDER_DEFAULT_MAX_TOKENS.custom).toBe(16384);
    });
  });
});
