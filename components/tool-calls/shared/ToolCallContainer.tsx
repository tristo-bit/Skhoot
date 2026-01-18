/**
 * Tool Call Container
 * 
 * Wrapper component that provides common UI for all tool calls:
 * - Collapsible header with tool name and icon
 * - Status badge (executing/success/error)
 * - Arguments display
 * - Action buttons (copy, cancel)
 */

import React, { memo, useState } from 'react';
import { 
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../../buttonFormat';
import { StatusBadge } from './StatusBadge';
import { ToolIcon } from './ToolIcon';

// ============================================================================
// Types
// ============================================================================

export interface ToolCallContainerProps {
  // Tool metadata
  toolName: string;
  displayName: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  
  // Status
  status: 'executing' | 'success' | 'error';
  durationMs?: number;
  
  // Arguments
  arguments: Record<string, any>;
  
  // Summary (optional - shown in collapsed state)
  summary?: string;
  
  // Actions
  onCancel?: () => void;
  
  // Custom styling
  headerClassName?: string;
  contentClassName?: string;
  
  // Children (the actual tool UI)
  children: React.ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatArguments(toolName: string, args: Record<string, any>): string {
  switch (toolName) {
    case 'shell':
    case 'execute_command':
      return args.command || args.cmd || JSON.stringify(args);
    case 'read_file':
    case 'write_file':
      return args.path || args.file_path || JSON.stringify(args);
    case 'list_directory':
      return args.path || args.directory || '.';
    case 'search_files':
      return args.pattern || args.query || JSON.stringify(args);
    case 'web_search':
      return args.query || JSON.stringify(args);
    case 'invoke_agent':
      return args.agent_id || JSON.stringify(args);
    default:
      return JSON.stringify(args);
  }
}

// ============================================================================
// Component
// ============================================================================

export const ToolCallContainer = memo<ToolCallContainerProps>(({ 
  toolName,
  displayName,
  icon: Icon,
  status,
  durationMs,
  arguments: args,
  summary,
  onCancel,
  headerClassName = '',
  contentClassName = '',
  children,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(args, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExecuting = status === 'executing';

  return (
    <>
      {/* Compact Header Card */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-glass-border glass-subtle hover:glass-elevated transition-all text-left ${headerClassName}`}
      >
        <div className="w-7 h-7 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0 text-text-secondary">
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-primary font-jakarta">
              {displayName}
            </span>
            <StatusBadge status={status} durationMs={durationMs} />
            {summary && (
              <span className="text-[10px] font-medium text-accent">
                {summary}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-text-secondary truncate">
            {formatArguments(toolName, args)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isExecuting && onCancel && (
            <Button
              onClick={(e) => {
                e?.stopPropagation();
                onCancel();
              }}
              variant="danger"
              size="xs"
            >
              Cancel
            </Button>
          )}
          {showDetails ? (
            <ChevronDown size={14} className="text-text-secondary" />
          ) : (
            <ChevronRight size={14} className="text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expandable Details (Arguments) */}
      {showDetails && (
        <div className="mt-2 p-3 rounded-xl border border-glass-border glass-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Arguments
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-text-primary bg-black/10 dark:bg-white/5 p-2 rounded-lg overflow-x-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}

      {/* Output - Tool-specific UI */}
      <div className={contentClassName}>
        {children}
      </div>
    </>
  );
});

ToolCallContainer.displayName = 'ToolCallContainer';
