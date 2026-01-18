/**
 * Web Search Loading UI
 * 
 * Custom loading component for web search with animated search icon.
 */

import React, { memo } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { ToolCallLoadingProps } from '../registry/types';

export const WebSearchLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  const query = toolCall.arguments.query || 'Searching...';
  
  return (
    <div className="mt-2 p-4 rounded-xl border border-glass-border glass-subtle">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Globe size={24} className="text-accent" />
          <Loader2 
            size={32} 
            className="absolute -top-1 -left-1 text-accent/30 animate-spin" 
            style={{ animationDuration: '2s' }}
          />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-text-primary mb-1">
            Searching the web...
          </p>
          <p className="text-[10px] font-mono text-text-secondary">
            "{query}"
          </p>
        </div>
      </div>
      
      {/* Animated search progress */}
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="h-12 rounded-lg glass-subtle animate-pulse"
            style={{ 
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>
    </div>
  );
});

WebSearchLoadingUI.displayName = 'WebSearchLoadingUI';
