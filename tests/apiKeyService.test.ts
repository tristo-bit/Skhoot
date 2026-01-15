import { describe, it, expect } from 'vitest';
import { PROVIDERS } from '../services/apiKeyService';

describe('APIKeyService', () => {
  it('should have all required providers', () => {
    expect(PROVIDERS).toBeDefined();
    expect(PROVIDERS.length).toBeGreaterThan(0);
  });

  it('should have OpenAI provider', () => {
    const openai = PROVIDERS.find(p => p.id === 'openai');
    expect(openai).toBeDefined();
    expect(openai?.name).toBe('OpenAI');
  });

  it('should have Anthropic provider', () => {
    const anthropic = PROVIDERS.find(p => p.id === 'anthropic');
    expect(anthropic).toBeDefined();
    expect(anthropic?.name).toBe('Anthropic');
  });

  it('should have Google AI provider', () => {
    const google = PROVIDERS.find(p => p.id === 'google');
    expect(google).toBeDefined();
    expect(google?.name).toBe('Google AI');
  });

  it('should have custom provider option', () => {
    const custom = PROVIDERS.find(p => p.id === 'custom');
    expect(custom).toBeDefined();
    expect(custom?.name).toBe('Custom');
  });

  it('should have valid provider structure', () => {
    PROVIDERS.forEach(provider => {
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('icon');
      expect(typeof provider.id).toBe('string');
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.icon).toBe('string');
    });
  });
});
