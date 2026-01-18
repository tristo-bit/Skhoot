/**
 * Write File UI Plugin
 * 
 * Displays write file operation results.
 */

import React, { memo, useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

// ============================================================================
// Component
// ============================================================================

export const WriteFileUI = memo<ToolCallUIProps>(({ 
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

  const filePath = toolCall.arguments.path || '';
  const mode = toolCall.arguments.mode || 'overwrite';

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
      
      {/* Write result */}
      {result.success ? (
        <div className="p-3 rounded-xl border border-glass-border glass-subtle">
          <div className="flex items-center gap-2 text-emerald-600">
            <FileText size={16} />
            <div>
              <p className="text-[11px] font-bold">File {mode === 'append' ? 'appended' : 'written'} successfully</p>
              <p className="text-[10px] font-mono text-text-secondary">{filePath}</p>
            </div>
          </div>
        </div>
      ) : (
        <pre className="text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] text-red-600 bg-red-500/10 border-red-500/20">
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

WriteFileUI.displayName = 'WriteFileUI';
