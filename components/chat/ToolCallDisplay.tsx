/**
 * Tool Call Display Component
 * 
 * Displays a tool call in a collapsible format with icon and parameters.
 * Shows tool name and icon when collapsed, full details when expanded.
 */

import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  Terminal,
  FileText,
  FolderOpen,
  Search,
  Globe,
  Bot,
  Users,
  Plus,
  Command,
  Eye,
  List,
} from 'lucide-react';

// Icon mapping for tool calls
const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  create_terminal: Terminal,
  execute_command: Terminal,
  read_output: Terminal,
  list_terminals: List,
  inspect_terminal: Eye,
  shell: Command,
  read_file: FileText,
  write_file: FileText,
  list_directory: FolderOpen,
  search_files: Search,
  web_search: Globe,
  invoke_agent: Bot,
  list_agents: Users,
  create_agent: Plus,
};

export interface ToolCallDisplayProps {
  toolName: string;
  parameters: Record<string, any>;
  defaultExpanded?: boolean;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolName,
  parameters,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = TOOL_ICONS[toolName] || Command;

  const hasParameters = Object.keys(parameters).length > 0;

  return (
    <div 
      className="inline-block max-w-full rounded-xl border border-accent/30 bg-accent/5 overflow-hidden"
      style={{
        fontSize: 'clamp(0.75rem, 0.85vmax, 0.95rem)',
      }}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center hover:bg-accent/10 transition-colors"
        style={{
          padding: 'clamp(0.5rem, 0.6vmax, 0.75rem) clamp(0.75rem, 0.9vmax, 1rem)',
          gap: 'clamp(0.5rem, 0.6vmax, 0.75rem)',
        }}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 text-accent">
          {isExpanded ? (
            <ChevronDown style={{ width: 'clamp(14px, 1vmax, 18px)', height: 'clamp(14px, 1vmax, 18px)' }} />
          ) : (
            <ChevronRight style={{ width: 'clamp(14px, 1vmax, 18px)', height: 'clamp(14px, 1vmax, 18px)' }} />
          )}
        </div>

        {/* Tool Icon */}
        <div 
          className="flex-shrink-0 rounded-lg bg-accent/20 text-accent flex items-center justify-center"
          style={{
            width: 'clamp(24px, 2vmax, 32px)',
            height: 'clamp(24px, 2vmax, 32px)',
          }}
        >
          <Icon style={{ width: 'clamp(14px, 1.2vmax, 18px)', height: 'clamp(14px, 1.2vmax, 18px)' }} />
        </div>

        {/* Tool Name */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center" style={{ gap: 'clamp(0.375rem, 0.5vmax, 0.625rem)' }}>
            <span 
              className="font-bold text-accent font-mono truncate"
              style={{ fontSize: 'clamp(0.75rem, 0.9vmax, 1rem)' }}
            >
              {toolName}
            </span>
            {hasParameters && !isExpanded && (
              <span 
                className="text-text-secondary font-medium"
                style={{ fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)' }}
              >
                ({Object.keys(parameters).length} param{Object.keys(parameters).length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>

        {/* Tool Call Badge */}
        <span 
          className="flex-shrink-0 rounded-full bg-accent/20 text-accent font-bold"
          style={{
            fontSize: 'clamp(0.625rem, 0.7vmax, 0.75rem)',
            padding: 'clamp(0.125rem, 0.15vmax, 0.25rem) clamp(0.375rem, 0.5vmax, 0.625rem)',
          }}
        >
          Tool Call
        </span>
      </button>

      {/* Expanded Content - Parameters */}
      {isExpanded && hasParameters && (
        <div 
          className="border-t border-accent/20 bg-black/5 dark:bg-white/5"
          style={{
            padding: 'clamp(0.75rem, 0.9vmax, 1rem)',
          }}
        >
          <div 
            className="font-mono text-text-primary bg-black/10 dark:bg-white/10 rounded-lg overflow-x-auto"
            style={{
              padding: 'clamp(0.5rem, 0.6vmax, 0.75rem)',
              fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
            }}
          >
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(parameters, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* No Parameters Message */}
      {isExpanded && !hasParameters && (
        <div 
          className="border-t border-accent/20 bg-black/5 dark:bg-white/5 text-text-secondary text-center font-medium"
          style={{
            padding: 'clamp(0.5rem, 0.6vmax, 0.75rem)',
            fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
          }}
        >
          No parameters
        </div>
      )}
    </div>
  );
};
