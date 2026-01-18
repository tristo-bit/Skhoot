/**
 * Terminal UI Plugin
 * 
 * Displays terminal operation results (create_terminal, execute_command, etc.)
 * using MiniTerminalView when appropriate.
 */

import React, { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';
import { MiniTerminalView } from '../../conversations/MiniTerminalView';

// ============================================================================
// Component
// ============================================================================

export const TerminalUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return null;
  }

  // Extract sessionId from arguments or result
  const sessionId = toolCall.arguments.sessionId || 
                    toolCall.arguments.session_id || 
                    (() => {
                      try {
                        const parsed = JSON.parse(result.output);
                        return parsed.sessionId || parsed.session_id || '';
                      } catch {
                        return '';
                      }
                    })();

  const command = toolCall.arguments.command || '';

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Output' : 'Error'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Terminal output */}
      {result.success && sessionId && (toolCall.name === 'execute_command' || toolCall.name === 'shell') ? (
        <MiniTerminalView
          sessionId={sessionId}
          command={command}
          maxLines={5}
        />
      ) : (
        <pre className={`text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] ${
          result.success 
            ? 'text-text-primary bg-black/10 dark:bg-white/5' 
            : 'text-red-600 bg-red-500/10 border-red-500/20'
        }`}>
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

TerminalUI.displayName = 'TerminalUI';
