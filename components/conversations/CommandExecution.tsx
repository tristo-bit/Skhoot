/**
 * Command Execution Component
 * 
 * Displays shell command execution with syntax highlighting,
 * working directory indicator, and execution time.
 */

import React, { memo, useState } from 'react';
import { 
  Terminal, 
  FolderOpen, 
  Clock, 
  Copy, 
  Check,
  XCircle,
  CheckCircle2,
  Square
} from 'lucide-react';
import { Button } from '../buttonFormat';

// ============================================================================
// Types
// ============================================================================

export interface CommandExecutionProps {
  command: string;
  workingDirectory?: string;
  output?: string;
  error?: string;
  exitCode?: number;
  durationMs?: number;
  isExecuting?: boolean;
  onCancel?: () => void;
}

// ============================================================================
// Command Execution Component
// ============================================================================

export const CommandExecution = memo<CommandExecutionProps>(({
  command,
  workingDirectory,
  output,
  error,
  exitCode,
  durationMs,
  isExecuting = false,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullOutput, setShowFullOutput] = useState(false);

  const isSuccess = exitCode === 0 || (exitCode === undefined && !error);
  const hasOutput = output || error;
  
  // Truncate long output
  const MAX_LINES = 15;
  const outputLines = (output || error || '').split('\n');
  const isTruncated = outputLines.length > MAX_LINES && !showFullOutput;
  const displayOutput = isTruncated 
    ? outputLines.slice(0, MAX_LINES).join('\n') + '\n...'
    : (output || error || '');

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyOutput = async () => {
    await navigator.clipboard.writeText(output || error || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-glass-border glass-subtle animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Command Header */}
      <div className="flex items-center gap-2 p-3 border-b border-glass-border">
        <div className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0">
          <Terminal size={16} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-text-primary font-jakarta">
              Shell Command
            </span>
            {isExecuting ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                <Clock size={12} className="animate-pulse" />
                Running...
              </span>
            ) : exitCode !== undefined ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isSuccess 
                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-600 border-red-500/30'
              }`}>
                {isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                Exit {exitCode}
              </span>
            ) : null}
            {durationMs !== undefined && (
              <span className="text-[10px] font-medium text-text-secondary">
                {durationMs}ms
              </span>
            )}
          </div>
          {workingDirectory && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-secondary">
              <FolderOpen size={10} />
              <span className="font-mono truncate">{workingDirectory}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExecuting && onCancel && (
            <Button
              onClick={onCancel}
              variant="danger"
              size="xs"
              icon={<Square size={12} />}
            >
              Stop
            </Button>
          )}
          <button
            onClick={handleCopyCommand}
            className="p-1.5 rounded-lg glass-subtle hover:glass-elevated transition-colors"
            title="Copy command"
          >
            {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} className="text-text-secondary" />}
          </button>
        </div>
      </div>

      {/* Command Display */}
      <div className="p-3 bg-black/20 dark:bg-black/40">
        <div className="flex items-start gap-2">
          <span className="text-emerald-500 font-mono text-[12px] font-bold select-none">$</span>
          <pre className="text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all flex-1">
            {command}
          </pre>
        </div>
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="border-t border-glass-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-glass-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {error && !output ? 'Error' : 'Output'}
            </span>
            <div className="flex items-center gap-2">
              {isTruncated && (
                <button
                  onClick={() => setShowFullOutput(true)}
                  className="text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
                >
                  Show all ({outputLines.length} lines)
                </button>
              )}
              {showFullOutput && outputLines.length > MAX_LINES && (
                <button
                  onClick={() => setShowFullOutput(false)}
                  className="text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
                >
                  Show less
                </button>
              )}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
              >
                <Copy size={10} />
                Copy
              </button>
            </div>
          </div>
          <pre className={`p-3 text-[11px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto ${
            error && !output ? 'text-red-500' : 'text-text-primary'
          }`}>
            {displayOutput}
          </pre>
        </div>
      )}

      {/* Loading state */}
      {isExecuting && !hasOutput && (
        <div className="p-3 flex items-center gap-2 text-text-secondary border-t border-glass-border">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-medium">Waiting for output...</span>
        </div>
      )}
    </div>
  );
});

CommandExecution.displayName = 'CommandExecution';
