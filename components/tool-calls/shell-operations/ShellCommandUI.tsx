/**
 * Shell Command UI Plugin
 * 
 * Displays shell command execution results using MiniTerminalView.
 */

import React, { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';
import { MiniTerminalView } from '../../conversations/MiniTerminalView';

// ============================================================================
// Component
// ============================================================================

export const ShellCommandUI = memo<ToolCallUIProps>(({ 
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

  // Try to extract sessionId from result
  let sessionId = '';
  try {
    const parsed = JSON.parse(result.output);
    sessionId = parsed.sessionId || parsed.session_id || '';
  } catch {
    // Not JSON, no sessionId
  }

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
      {result.success && sessionId ? (
        <MiniTerminalView
          sessionId={sessionId}
          command={toolCall.arguments.command}
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

ShellCommandUI.displayName = 'ShellCommandUI';
