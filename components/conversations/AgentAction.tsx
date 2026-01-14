/**
 * Agent Action Component
 * 
 * Displays agent tool calls in the conversation UI with expandable details,
 * loading states, and success/error indicators.
 */

import React, { memo, useState } from 'react';
import { 
  Terminal, 
  FileText, 
  FolderOpen, 
  Search, 
  Bot,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '../buttonFormat';

// ============================================================================
// Types
// ============================================================================

export interface AgentToolCall {
  id: string;
  name: 'shell' | 'read_file' | 'write_file' | 'list_directory' | 'search_files';
  arguments: Record<string, any>;
}

export interface AgentToolResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface AgentActionProps {
  toolCall: AgentToolCall;
  result?: AgentToolResult;
  isExecuting?: boolean;
  onCancel?: () => void;
}

// ============================================================================
// Tool Icon Component
// ============================================================================

const ToolIcon: React.FC<{ toolName: string; size?: number }> = ({ toolName, size = 16 }) => {
  const icons: Record<string, React.ReactNode> = {
    shell: <Terminal size={size} />,
    read_file: <FileText size={size} />,
    write_file: <FileText size={size} />,
    list_directory: <FolderOpen size={size} />,
    search_files: <Search size={size} />,
  };
  return <>{icons[toolName] || <Bot size={size} />}</>;
};

// ============================================================================
// Tool Name Display
// ============================================================================

const getToolDisplayName = (toolName: string): string => {
  const names: Record<string, string> = {
    shell: 'Shell Command',
    read_file: 'Read File',
    write_file: 'Write File',
    list_directory: 'List Directory',
    search_files: 'Search Files',
  };
  return names[toolName] || toolName;
};

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusBadge: React.FC<{ 
  status: 'executing' | 'success' | 'error';
  durationMs?: number;
}> = ({ status, durationMs }) => {
  const configs = {
    executing: {
      icon: <Clock size={12} className="animate-pulse" />,
      text: 'Executing...',
      className: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    },
    success: {
      icon: <CheckCircle2 size={12} />,
      text: durationMs ? `${durationMs}ms` : 'Done',
      className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    },
    error: {
      icon: <XCircle size={12} />,
      text: 'Failed',
      className: 'bg-red-500/20 text-red-600 border-red-500/30',
    },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  );
};

// ============================================================================
// Agent Action Component
// ============================================================================

export const AgentAction = memo<AgentActionProps>(({ 
  toolCall, 
  result, 
  isExecuting = false,
  onCancel 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = isExecuting ? 'executing' : result?.success ? 'success' : result ? 'error' : 'executing';

  const handleCopy = async () => {
    const content = result?.output || JSON.stringify(toolCall.arguments, null, 2);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format arguments for display
  const formatArguments = () => {
    const args = toolCall.arguments;
    switch (toolCall.name) {
      case 'shell':
        return args.command || args.cmd || JSON.stringify(args);
      case 'read_file':
      case 'write_file':
        return args.path || args.file_path || JSON.stringify(args);
      case 'list_directory':
        return args.path || args.directory || '.';
      case 'search_files':
        return args.pattern || args.query || JSON.stringify(args);
      default:
        return JSON.stringify(args);
    }
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-glass-border glass-subtle animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0 text-text-secondary">
            <ToolIcon toolName={toolCall.name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-text-primary font-jakarta">
                {getToolDisplayName(toolCall.name)}
              </span>
              <StatusBadge status={status} durationMs={result?.durationMs} />
            </div>
            <p className="text-[11px] font-mono text-text-secondary truncate mt-0.5">
              {formatArguments()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-glass-border">
          {/* Arguments */}
          <div className="p-3 border-b border-glass-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Arguments
              </span>
            </div>
            <pre className="text-[11px] font-mono text-text-primary bg-black/10 dark:bg-white/5 p-2 rounded-lg overflow-x-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {result && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
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
              <pre className={`text-[11px] font-mono p-2 rounded-lg overflow-x-auto max-h-[200px] ${
                result.success 
                  ? 'text-text-primary bg-black/10 dark:bg-white/5' 
                  : 'text-red-600 bg-red-500/10'
              }`}>
                {result.output || result.error || 'No output'}
              </pre>
            </div>
          )}

          {/* Loading state */}
          {isExecuting && !result && (
            <div className="p-3 flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-medium">Executing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AgentAction.displayName = 'AgentAction';
