/**
 * Agent Log Tab Component
 * 
 * Displays agent status, real-time activity logs, and configuration options.
 * Shows tool executions, command outputs, and agent state changes.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  FileText, 
  FolderOpen, 
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Pause,
  Play,
  Download,
  Filter
} from 'lucide-react';
import { 
  agentService, 
  AgentStatus, 
  AgentMessage, 
  AgentToolCall, 
  ToolResult,
  AgentEventData 
} from '../../services/agentService';

// ============================================================================
// Types
// ============================================================================

interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: 'status' | 'message' | 'tool_start' | 'tool_complete' | 'error' | 'info';
  content: string;
  details?: any;
  expanded?: boolean;
}

interface AgentLogTabProps {
  sessionId: string;
  isActive: boolean;
}

// ============================================================================
// Status Indicator Component
// ============================================================================

const StatusIndicator: React.FC<{ 
  label: string; 
  status: 'success' | 'pending' | 'error' | 'inactive';
  detail?: string;
}> = ({ label, status, detail }) => {
  const icons = {
    success: <CheckCircle2 size={14} className="text-emerald-500" />,
    pending: <Clock size={14} className="text-amber-500 animate-pulse" />,
    error: <XCircle size={14} className="text-red-500" />,
    inactive: <Clock size={14} className="text-gray-400" />,
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {icons[status]}
      <span style={{ color: 'var(--text-primary)' }}>{label}</span>
      {detail && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ({detail})
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Tool Icon Component
// ============================================================================

const ToolIcon: React.FC<{ toolName: string }> = ({ toolName }) => {
  const icons: Record<string, React.ReactNode> = {
    shell: <Terminal size={14} />,
    read_file: <FileText size={14} />,
    write_file: <FileText size={14} />,
    list_directory: <FolderOpen size={14} />,
    search_files: <Search size={14} />,
  };
  return <>{icons[toolName] || <Bot size={14} />}</>;
};

// ============================================================================
// Log Entry Component
// ============================================================================

const LogEntry: React.FC<{ 
  entry: AgentLogEntry; 
  onToggle: () => void;
}> = ({ entry, onToggle }) => {
  const typeColors: Record<string, string> = {
    status: 'text-blue-400',
    message: 'text-purple-400',
    tool_start: 'text-amber-400',
    tool_complete: 'text-emerald-400',
    error: 'text-red-400',
    info: 'text-gray-400',
  };

  const typeLabels: Record<string, string> = {
    status: 'STATUS',
    message: 'MSG',
    tool_start: 'TOOL',
    tool_complete: 'DONE',
    error: 'ERROR',
    info: 'INFO',
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const hasDetails = entry.details && Object.keys(entry.details).length > 0;

  return (
    <div className="font-mono text-xs leading-relaxed">
      <div 
        className={`flex items-start gap-2 ${hasDetails ? 'cursor-pointer hover:bg-white/5 rounded px-1 -mx-1' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <span style={{ color: 'var(--text-secondary)' }}>{formatTime(entry.timestamp)}</span>
        <span className={`${typeColors[entry.type]} font-semibold w-12`}>
          [{typeLabels[entry.type]}]
        </span>
        {hasDetails && (
          entry.expanded 
            ? <ChevronDown size={12} className="mt-0.5" style={{ color: 'var(--text-secondary)' }} />
            : <ChevronRight size={12} className="mt-0.5" style={{ color: 'var(--text-secondary)' }} />
        )}
        <span style={{ color: 'var(--text-primary)' }} className="flex-1">
          {entry.content}
        </span>
      </div>
      
      {entry.expanded && entry.details && (
        <div 
          className="ml-20 mt-1 mb-2 p-2 rounded text-xs overflow-x-auto"
          style={{ 
            background: 'rgba(0,0,0,0.2)',
            color: 'var(--text-secondary)'
          }}
        >
          <pre className="whitespace-pre-wrap break-words">
            {typeof entry.details === 'string' 
              ? entry.details 
              : JSON.stringify(entry.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// Main Component
// ============================================================================

export const AgentLogTab: React.FC<AgentLogTabProps> = ({ sessionId, isActive }) => {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Generate unique log ID
  const generateLogId = useCallback(() => {
    return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Add log entry
  const addLog = useCallback((
    type: AgentLogEntry['type'], 
    content: string, 
    details?: any
  ) => {
    const entry: AgentLogEntry = {
      id: generateLogId(),
      timestamp: Math.floor(Date.now() / 1000),
      type,
      content,
      details,
      expanded: false,
    };
    setLogs(prev => [...prev, entry]);
  }, [generateLogId]);

  // Toggle log entry expansion
  const toggleLogEntry = useCallback((logId: string) => {
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, expanded: !log.expanded } : log
    ));
  }, []);

  // Fetch initial status
  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const s = await agentService.getStatus(sessionId);
        if (s) {
          setStatus(s);
          addLog('info', `Agent session initialized (${s.provider} - ${s.model})`);
        }
      } catch (error) {
        addLog('error', `Failed to get agent status: ${error}`);
      }
    };

    fetchStatus();
  }, [sessionId, addLog]);

  // Subscribe to agent events
  useEffect(() => {
    if (!sessionId) return;

    const unsubMessage = agentService.on('message', (data: AgentEventData) => {
      if (data.sessionId !== sessionId || !data.message) return;
      
      const msg = data.message;
      if (msg.role === 'user') {
        addLog('message', `User: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      } else if (msg.role === 'assistant') {
        addLog('message', `Assistant: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`, 
          msg.toolCalls ? { toolCalls: msg.toolCalls } : undefined
        );
      } else if (msg.role === 'tool') {
        addLog('info', `Tool result received`, { output: msg.content.slice(0, 500) });
      }
    });

    const unsubToolStart = agentService.on('tool_start', (data: AgentEventData) => {
      if (data.sessionId !== sessionId || !data.toolCall) return;
      
      const tc = data.toolCall;
      addLog('tool_start', `Executing: ${tc.name}`, tc.arguments);
    });

    const unsubToolComplete = agentService.on('tool_complete', (data: AgentEventData) => {
      if (data.sessionId !== sessionId || !data.toolResult) return;
      
      const tr = data.toolResult;
      if (tr.success) {
        addLog('tool_complete', `Completed in ${tr.durationMs}ms`, 
          { output: tr.output.slice(0, 1000) }
        );
      } else {
        addLog('error', `Tool failed: ${tr.error}`, { output: tr.output });
      }
    });

    const unsubError = agentService.on('error', (data: AgentEventData) => {
      if (data.sessionId !== sessionId) return;
      addLog('error', data.error || 'Unknown error');
    });

    const unsubCancelled = agentService.on('cancelled', (data: AgentEventData) => {
      if (data.sessionId !== sessionId) return;
      addLog('info', 'Action cancelled by user');
    });

    // Add initial status logs
    addLog('status', '✓ Agent properly launched');
    if (status) {
      addLog('status', `✓ API key loaded (${status.provider} - ${status.model})`);
    }
    addLog('status', '✓ Terminal access ready');
    addLog('status', '✓ Agent ready to receive commands');

    return () => {
      unsubMessage();
      unsubToolStart();
      unsubToolComplete();
      unsubError();
      unsubCancelled();
    };
  }, [sessionId, status, addLog]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = filterType 
    ? logs.filter(log => log.type === filterType)
    : logs;

  // Copy logs to clipboard
  const handleCopyLogs = useCallback(() => {
    const text = filteredLogs.map(log => {
      const time = new Date(log.timestamp * 1000).toISOString();
      return `[${time}] [${log.type.toUpperCase()}] ${log.content}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
  }, [filteredLogs]);

  // Clear logs
  const handleClearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  }, [addLog]);

  // Export logs as JSON
  const handleExportLogs = useCallback(() => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-log-${sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, sessionId]);

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <div className="flex items-center gap-4">
          <StatusIndicator 
            label="Agent" 
            status={status?.state === 'ready' ? 'success' : status?.state === 'error' ? 'error' : 'pending'}
            detail={status?.state}
          />
          <StatusIndicator 
            label="API Key" 
            status={status ? 'success' : 'inactive'}
            detail={status ? `${status.provider}` : undefined}
          />
          <StatusIndicator 
            label="Terminal" 
            status="success"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="text-xs px-2 py-1 rounded border cursor-pointer"
            style={{ 
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary, #1a1a2e)',
            }}
          >
            <option value="" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>All logs</option>
            <option value="status" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Status</option>
            <option value="message" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Messages</option>
            <option value="tool_start" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Tool Start</option>
            <option value="tool_complete" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Tool Complete</option>
            <option value="error" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Errors</option>
            <option value="info" style={{ background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-secondary)' }}>Info</option>
          </select>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded transition-all ${autoScroll ? 'text-emerald-500' : ''}`}
            style={{ color: autoScroll ? undefined : 'var(--text-secondary)' }}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          >
            {autoScroll ? <Play size={14} /> : <Pause size={14} />}
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded transition-all hover:bg-cyan-500/10 hover:text-cyan-500"
            style={{ color: 'var(--text-secondary)' }}
            title="Copy Logs"
          >
            <Copy size={14} />
          </button>

          {/* Export */}
          <button
            onClick={handleExportLogs}
            className="p-1.5 rounded transition-all hover:bg-purple-500/10 hover:text-purple-500"
            style={{ color: 'var(--text-secondary)' }}
            title="Export Logs"
          >
            <Download size={14} />
          </button>

          {/* Clear */}
          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded transition-all hover:bg-amber-500/10 hover:text-amber-500"
            style={{ color: 'var(--text-secondary)' }}
            title="Clear Logs"
          >
            <Trash2 size={14} />
          </button>

          {/* Config toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded transition-all ${showConfig ? 'text-purple-500 bg-purple-500/10' : 'hover:bg-white/5'}`}
            style={{ color: showConfig ? undefined : 'var(--text-secondary)' }}
            title="Configuration"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Config Panel (collapsible) */}
      {showConfig && status && (
        <div 
          className="px-4 py-3 border-b text-sm"
          style={{ 
            borderColor: 'var(--glass-border)',
            background: 'rgba(0,0,0,0.1)'
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Provider
              </label>
              <div style={{ color: 'var(--text-primary)' }}>{status.provider}</div>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Model
              </label>
              <div style={{ color: 'var(--text-primary)' }}>{status.model}</div>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Messages
              </label>
              <div style={{ color: 'var(--text-primary)' }}>{status.messageCount}</div>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                State
              </label>
              <div style={{ color: 'var(--text-primary)' }}>{status.state}</div>
            </div>
          </div>
        </div>
      )}

      {/* Log Output */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div 
            className="text-center py-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Bot size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No logs yet. Agent activity will appear here.</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogEntry 
              key={log.id} 
              entry={log} 
              onToggle={() => toggleLogEntry(log.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AgentLogTab;
