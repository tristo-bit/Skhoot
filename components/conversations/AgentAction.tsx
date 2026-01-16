/**
 * Agent Action Component
 * 
 * Displays agent tool calls in the conversation UI with expandable details,
 * loading states, and success/error indicators.
 * 
 * For file-related tools (list_directory, search_files), renders results
 * using the unified FileCard component for a consistent experience.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
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
  Check,
  Grid,
  List
} from 'lucide-react';
import { Button } from '../buttonFormat';
import { MarkdownRenderer, FileCard, type FileCardFile } from '../ui';
import { MiniTerminalView } from './MiniTerminalView';
import { useSettings } from '../../src/contexts/SettingsContext';

// ============================================================================
// Types
// ============================================================================

export interface AgentToolCall {
  id: string;
  name: 'shell' | 'read_file' | 'write_file' | 'list_directory' | 'search_files' | 'execute_command';
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
  onNavigateDirectory?: (path: string) => void;
}

// ============================================================================
// Output Parsing Utilities
// ============================================================================

function parseDirectoryListing(output: string, basePath: string = ''): FileCardFile[] {
  const files: FileCardFile[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('total ') || line.startsWith('Directory:')) {
      continue;
    }
    
    let parsed = parseUnixLsLine(line, basePath) || 
                 parseSimpleLine(line, basePath) ||
                 parseJsonLine(line);
    
    if (parsed) {
      files.push(parsed);
    }
  }
  
  return files;
}

function parseUnixLsLine(line: string, basePath: string): FileCardFile | null {
  const lsRegex = /^([d\-rwxsStT@+.]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/;
  const match = line.match(lsRegex);
  
  if (match) {
    const [, permissions, size, date, name] = match;
    const isDirectory = permissions.startsWith('d');
    const fullPath = basePath ? `${basePath}/${name}` : name;
    
    return {
      id: fullPath,
      name: name,
      path: fullPath,
      size: formatFileSize(parseInt(size, 10)),
      category: isDirectory ? 'Folder' : detectCategory(name),
      safeToRemove: false,
      lastUsed: date,
    };
  }
  
  return null;
}

function parseSimpleLine(line: string, basePath: string): FileCardFile | null {
  const trimmed = line.trim();
  if (!trimmed || (trimmed.includes(':') && !trimmed.includes('/'))) {
    return null;
  }
  
  let name = trimmed;
  let fullPath = trimmed;
  
  if (name.startsWith('./')) {
    name = name.slice(2);
  }
  
  const lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  const fileName = lastSlash >= 0 ? name.slice(lastSlash + 1) : name;
  
  if (basePath && !fullPath.startsWith('/') && !fullPath.startsWith('~')) {
    fullPath = `${basePath}/${name}`;
  }
  
  const isDirectory = trimmed.endsWith('/') || (!fileName.includes('.') && !trimmed.includes('.'));
  
  return {
    id: fullPath,
    name: fileName || name,
    path: fullPath,
    size: isDirectory ? '-' : 'Unknown',
    category: isDirectory ? 'Folder' : detectCategory(fileName),
    safeToRemove: false,
    lastUsed: 'Unknown',
  };
}

function parseJsonLine(line: string): FileCardFile | null {
  try {
    const data = JSON.parse(line);
    if (data.path || data.name) {
      return {
        id: data.path || data.name,
        name: data.name || data.path.split('/').pop() || data.path,
        path: data.path || data.name,
        size: data.size ? formatFileSize(data.size) : 'Unknown',
        category: data.type === 'directory' ? 'Folder' : detectCategory(data.name || ''),
        safeToRemove: false,
        lastUsed: data.modified || 'Unknown',
      };
    }
  } catch {
    // Not JSON
  }
  return null;
}

function parseSearchResults(output: string): FileCardFile[] {
  const files: FileCardFile[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const grepMatch = trimmed.match(/^(.+?):(\d+):(.*)$/);
    if (grepMatch) {
      const [, filePath, lineNum, snippet] = grepMatch;
      const fileName = filePath.split('/').pop() || filePath;
      
      const existing = files.find(f => f.path === filePath);
      if (!existing) {
        const fileInfo: FileCardFile = {
          id: filePath,
          name: fileName,
          path: filePath,
          size: 'Unknown',
          category: detectCategory(fileName),
          safeToRemove: false,
          lastUsed: 'Unknown',
          snippet: `Line ${lineNum}: ${snippet.slice(0, 100)}`,
          relevanceScore: 85,
        };
        files.push(fileInfo);
      }
      continue;
    }
    
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      const fileName = trimmed.split(/[/\\]/).pop() || trimmed;
      files.push({
        id: trimmed,
        name: fileName,
        path: trimmed,
        size: 'Unknown',
        category: detectCategory(fileName),
        safeToRemove: false,
        lastUsed: 'Unknown',
      });
    }
  }
  
  return files;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes)) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategory(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const categories: Record<string, string[]> = {
    'Code': ['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h'],
    'Document': ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
    'Image': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
    'Config': ['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env'],
    'Style': ['css', 'scss', 'sass', 'less'],
  };
  
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  
  return 'Other';
}

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || '';
}

function isCodeFile(path: string): boolean {
  const ext = getFileExtension(path);
  const codeExtensions = [
    'js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'hpp',
    'css', 'scss', 'sass', 'less', 'html', 'xml', 'json', 'yaml', 'yml', 'toml',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'sql', 'graphql', 'md',
    'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'vim', 'dockerfile'
  ];
  return codeExtensions.includes(ext);
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

const getToolDisplayName = (toolName: string): string => {
  const names: Record<string, string> = {
    shell: 'Shell Command',
    execute_command: 'Execute Command',
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
  onCancel,
  onNavigateDirectory,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [localLayout, setLocalLayout] = useState<'list' | 'grid' | null>(null);
  
  // Get layout preference from settings
  const { searchDisplay } = useSettings();
  
  // Use local override if set, otherwise use settings (compact for agent, respect settings for expanded)
  const effectiveLayout = localLayout || (searchDisplay.layout === 'grid' ? 'grid' : 'compact');

  const status = isExecuting ? 'executing' : result?.success ? 'success' : result ? 'error' : 'executing';

  // Parse file-related tool outputs
  const parsedFiles = useMemo(() => {
    if (!result?.success || !result.output) return null;
    
    if (toolCall.name === 'list_directory') {
      const basePath = toolCall.arguments.path || toolCall.arguments.directory || '.';
      const files = parseDirectoryListing(result.output, basePath);
      return files.length > 0 ? files : null;
    }
    
    if (toolCall.name === 'search_files') {
      const files = parseSearchResults(result.output);
      return files.length > 0 ? files : null;
    }
    
    return null;
  }, [toolCall, result]);

  const hasFileUI = parsedFiles && parsedFiles.length > 0;

  const handleCopy = async () => {
    const content = result?.output || JSON.stringify(toolCall.arguments, null, 2);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigate = useCallback((path: string) => {
    if (onNavigateDirectory) {
      onNavigateDirectory(path);
    } else {
      // Fallback: dispatch event for agent to handle
      const event = new CustomEvent('agent-navigate-directory', {
        detail: { path }
      });
      window.dispatchEvent(event);
    }
  }, [onNavigateDirectory]);

  const toggleLayout = useCallback(() => {
    setLocalLayout(prev => {
      if (prev === 'grid') return 'compact';
      if (prev === 'compact' || prev === null) return 'grid';
      return 'compact';
    });
  }, []);

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

  const getResultSummary = () => {
    if (hasFileUI) {
      return `${parsedFiles.length} item${parsedFiles.length !== 1 ? 's' : ''} found`;
    }
    if (toolCall.name === 'read_file' && result?.success) {
      const lines = result.output.split('\n').length;
      return `${lines} line${lines !== 1 ? 's' : ''}`;
    }
    if (toolCall.name === 'shell' && result?.success) {
      const lines = result.output.split('\n').filter(l => l.trim()).length;
      return lines > 0 ? `${lines} line${lines !== 1 ? 's' : ''}` : 'Done';
    }
    return null;
  };

  return (
    <div className="my-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Compact Header Card */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-glass-border glass-subtle hover:glass-elevated transition-all text-left"
      >
        <div className="w-7 h-7 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0 text-text-secondary">
          <ToolIcon toolName={toolCall.name} size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-primary font-jakarta">
              {getToolDisplayName(toolCall.name)}
            </span>
            <StatusBadge status={status} durationMs={result?.durationMs} />
            {getResultSummary() && (
              <span className="text-[10px] font-medium text-accent">
                {getResultSummary()}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-text-secondary truncate">
            {formatArguments()}
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
          </div>
          <pre className="text-[11px] font-mono text-text-primary bg-black/10 dark:bg-white/5 p-2 rounded-lg overflow-x-auto">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* Output - Always visible */}
      {result && (
        <div className="mt-2">
          {/* Output header with actions */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {result.success ? 'Output' : 'Error'}
            </span>
            <div className="flex items-center gap-2">
              {hasFileUI && (
                <>
                  <button
                    onClick={toggleLayout}
                    className="flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-accent transition-colors"
                    title={effectiveLayout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                  >
                    {effectiveLayout === 'grid' ? <List size={12} /> : <Grid size={12} />}
                  </button>
                  <button
                    onClick={() => setShowRawOutput(!showRawOutput)}
                    className="text-[10px] font-bold text-text-secondary hover:text-accent transition-colors"
                  >
                    {showRawOutput ? 'Show UI' : 'Show Raw'}
                  </button>
                </>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          {/* File UI for list_directory and search_files */}
          {hasFileUI && !showRawOutput ? (
            effectiveLayout === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {parsedFiles.map((file, index) => (
                  <FileCard 
                    key={file.id || index} 
                    file={file} 
                    layout="grid"
                    showRelevanceScore={toolCall.name === 'search_files'}
                    showSnippet={false}
                    showAddToChat={true}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                {parsedFiles.map((file, index) => (
                  <FileCard 
                    key={file.id || index} 
                    file={file} 
                    layout="compact"
                    showRelevanceScore={toolCall.name === 'search_files'}
                    showSnippet={toolCall.name === 'search_files'}
                    showAddToChat={true}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            )
          ) : toolCall.name === 'read_file' && result.success ? (
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar rounded-xl border border-glass-border bg-black/10 dark:bg-white/5">
              {isCodeFile(toolCall.arguments.path || '') ? (
                <pre className="text-[11px] font-mono text-text-primary p-3 overflow-x-auto">
                  <code>{result.output}</code>
                </pre>
              ) : (toolCall.arguments.path || '').endsWith('.md') ? (
                <div className="p-3">
                  <MarkdownRenderer content={result.output} />
                </div>
              ) : (
                <pre className="text-[11px] font-mono text-text-primary p-3 overflow-x-auto">
                  {result.output}
                </pre>
              )}
            </div>
          ) : (toolCall.name === 'shell' || toolCall.name === 'execute_command') && result.success ? (
            <MiniTerminalView
              sessionId={(() => {
                // Try to get sessionId from arguments first
                if (toolCall.arguments.sessionId) return toolCall.arguments.sessionId;
                
                // Try to parse from result output (JSON format)
                try {
                  const parsed = JSON.parse(result.output);
                  if (parsed.sessionId) return parsed.sessionId;
                } catch {
                  // Not JSON, try regex
                  const match = result.output.match(/sessionId['":\s]+([a-f0-9-]+)/i);
                  if (match) return match[1];
                }
                
                return '';
              })()}
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
      )}

      {/* Loading state */}
      {isExecuting && !result && (
        <div className="mt-2 p-3 rounded-xl border border-glass-border glass-subtle flex items-center gap-2 text-text-secondary">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-medium">Executing...</span>
        </div>
      )}
    </div>
  );
});

AgentAction.displayName = 'AgentAction';
