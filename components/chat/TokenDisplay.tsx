/**
 * TokenDisplay Component
 * 
 * Shows tokens spent in current conversation only.
 * Format: [Model-Name] Token spend: X (model name optional via settings)
 * Resets to 0 on new chat.
 * Hidden until conversation starts.
 */

import { useState, useEffect, memo } from 'react';
import { tokenTrackingService, ConversationTokens, TokenUpdateEvent } from '../../services/tokenTrackingService';
import { useSettings } from '../../src/contexts/SettingsContext';

interface TokenDisplayProps {
  className?: string;
}

export const TokenDisplay = memo<TokenDisplayProps>(({ className = '' }) => {
  const { tokenDisplay } = useSettings();
  const [tokens, setTokens] = useState<ConversationTokens>(() => 
    tokenTrackingService.getConversationTokens()
  );
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    // Subscribe to ALL updates (including resets)
    const unsubscribe = tokenTrackingService.subscribe((event: TokenUpdateEvent) => {
      setTokens(event.conversationTokens);
      
      // Animate only on new tokens (not reset)
      if (event.lastRecord) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Don't show if disabled in settings or no tokens spent yet
  if (!tokenDisplay.enabled || tokens.totalSpent === 0) {
    return null;
  }
  
  const modelName = formatModelName(tokens.model);
  const formattedTokens = formatTokenCount(tokens.totalSpent);
  
  return (
    <div 
      className={`token-display flex items-center gap-1.5 ${className}`}
      style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--text-tertiary, #888)',
        opacity: 0.8,
        transition: 'all 0.3s ease',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
      }}
      title={`Cost: $${tokens.cost.toFixed(4)}`}
    >
      {tokenDisplay.showModelName && (
        <>
          <span style={{ opacity: 0.5 }}>[</span>
          <span 
            style={{ 
              color: 'var(--color-primary, #10b981)',
              fontWeight: 600,
            }}
          >
            {modelName}
          </span>
          <span style={{ opacity: 0.5 }}>]</span>
        </>
      )}
      <span style={{ color: 'var(--text-secondary, #999)' }}>Token spend:</span>
      <span 
        style={{ 
          color: isAnimating ? 'var(--color-primary, #10b981)' : 'var(--text-primary, #ccc)',
          fontWeight: 500,
          transition: 'color 0.3s ease',
        }}
      >
        {formattedTokens}
      </span>
    </div>
  );
});

TokenDisplay.displayName = 'TokenDisplay';

// Format model name (shorten)
function formatModelName(model: string): string {
  const shortNames: Record<string, string> = {
    'gpt-4o-mini': 'GPT-4o-mini',
    'gpt-4o': 'GPT-4o',
    'o1': 'O1',
    'o3': 'O3',
    'gpt-4-turbo': 'GPT-4-Turbo',
    'gpt-3.5-turbo': 'GPT-3.5',
    'gemini-2.0-flash': 'Gemini-2.0',
    'gemini-2.0-flash-thinking': 'Gemini-Think',
    'gemini-2.0-pro': 'Gemini-2.0-Pro',
    'gemini-1.5-pro': 'Gemini-1.5-Pro',
    'gemini-1.5-flash': 'Gemini-1.5',
    'claude-3-5-sonnet': 'Claude-Sonnet',
    'claude-3-5-haiku': 'Claude-Haiku',
    'claude-3-opus': 'Claude-Opus',
    'claude-3-haiku': 'Claude-Haiku',
  };
  
  for (const [full, short] of Object.entries(shortNames)) {
    if (model.toLowerCase().includes(full.toLowerCase())) {
      return short;
    }
  }
  
  // Capitalize first letter, truncate if needed
  if (model.length > 15) {
    return model.slice(0, 12) + '...';
  }
  return model.charAt(0).toUpperCase() + model.slice(1);
}

// Format token count with K/M suffixes
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export default TokenDisplay;
