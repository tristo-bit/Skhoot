/**
 * Create Agent UI Plugin
 * 
 * Displays agent creation results.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, Workflow, CheckCircle } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

// ============================================================================
// Component
// ============================================================================

export const CreateAgentUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  const creationResult = useMemo(() => {
    if (!result?.output) return null;
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }, [result]);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return null;
  }

  const agentName = toolCall.arguments.name || 'New Agent';

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Agent Created' : 'Error'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Creation result */}
      {result.success && creationResult ? (
        <div className="p-3 rounded-xl border border-glass-border glass-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Workflow size={16} className="text-emerald-600" />
            <span className="text-[11px] font-bold text-text-primary">
              {agentName}
            </span>
            <CheckCircle size={12} className="text-emerald-600 ml-auto" />
          </div>
          <p className="text-[10px] text-text-secondary mb-2">
            {toolCall.arguments.description || 'Agent created successfully'}
          </p>
          {creationResult.agent_id && (
            <div className="text-[9px] font-mono text-text-secondary bg-black/10 dark:bg-white/5 p-2 rounded">
              ID: {creationResult.agent_id}
            </div>
          )}
        </div>
      ) : (
        <pre className="text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] text-red-600 bg-red-500/10 border-red-500/20">
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

CreateAgentUI.displayName = 'CreateAgentUI';
