/**
 * Web Search Custom Wrapper
 * 
 * Example of a completely custom card wrapper for web search.
 * Demonstrates full control over card design, animations, and layout.
 */

import React, { memo, useState } from 'react';
import { Globe, ChevronDown, ChevronRight, Copy, Check, X } from 'lucide-react';
import { ToolCallWrapperProps } from '../registry/types';
import { StatusBadge } from '../shared/StatusBadge';
import { Button } from '../../buttonFormat';

export const WebSearchCustomWrapper = memo<ToolCallWrapperProps>(({ 
  toolCall,
  result,
  isExecuting,
  onCancel,
  children,
  plugin,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const status = isExecuting ? 'executing' : result?.success ? 'success' : result ? 'error' : 'executing';
  const query = toolCall.arguments.query || '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(toolCall.arguments, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 animate-in fade-in slide-in-from-left duration-500">
      {/* Custom header with gradient background */}
      <div className="rounded-t-xl bg-gradient-to-r from-accent/10 via-purple-500/10 to-accent/10 border border-glass-border border-b-0 p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg">
            <Globe size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-text-primary font-jakarta">
                {plugin.displayName}
              </span>
              <StatusBadge status={status} durationMs={result?.durationMs} />
            </div>
            <p className="text-[10px] font-medium text-text-secondary">
              "{query}"
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isExecuting && onCancel && (
              <Button
                onClick={onCancel}
                variant="danger"
                size="xs"
              >
                <X size={12} />
              </Button>
            )}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1.5 rounded-lg glass-subtle hover:glass-elevated transition-all"
            >
              {showDetails ? (
                <ChevronDown size={14} className="text-text-secondary" />
              ) : (
                <ChevronRight size={14} className="text-text-secondary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Arguments (collapsible) */}
      {showDetails && (
        <div className="border-x border-glass-border p-3 glass-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Search Parameters
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="font-bold text-text-secondary">Query:</span>
              <span className="font-mono text-text-primary">{toolCall.arguments.query}</span>
            </div>
            {toolCall.arguments.num_results && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-text-secondary">Results:</span>
                <span className="font-mono text-text-primary">{toolCall.arguments.num_results}</span>
              </div>
            )}
            {toolCall.arguments.search_type && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-text-secondary">Type:</span>
                <span className="font-mono text-text-primary">{toolCall.arguments.search_type}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="rounded-b-xl border border-glass-border border-t-0 glass-subtle">
        {children}
      </div>
    </div>
  );
});

WebSearchCustomWrapper.displayName = 'WebSearchCustomWrapper';
