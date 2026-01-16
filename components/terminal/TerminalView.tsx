import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Terminal, X, Plus, Copy, Trash2, GripHorizontal, Bot } from 'lucide-react';
import { terminalService } from '../../services/terminalService';
import { agentService } from '../../services/agentService';
import { terminalContextStore } from '../../services/agentTools/terminalTools';
// COMMENTED OUT: Old AgentLogTab - replaced by AI Terminal view
// import { AgentLogTab } from './AgentLogTab';

interface TerminalTab {
  id: string;
  title: string;
  type: 'shell' | 'codex' | 'skhoot-log' | 'agent-log';
  sessionId: string;
  createdBy?: 'user' | 'ai';
  workspaceRoot?: string;
}

interface TerminalViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSendCommand: (sendFn: (command: string) => void) => void;
  /** Auto-create an agent log tab with this session ID */
  autoCreateAgentLog?: string | null;
  /** Callback when agent log tab is created */
  onAgentLogCreated?: (tabId: string) => void;
  /** Callback when agent log tab is closed */
  onAgentLogClosed?: () => void;
}

const TERMINAL_HEIGHT_KEY = 'skhoot-terminal-height';
const DEFAULT_HEIGHT = 250;
const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;

// Global store for AI terminal output - allows MiniTerminalView to access it
class AITerminalOutputStore {
  private listeners: Set<(output: string[], sessionId: string) => void> = new Set();
  private currentOutput: string[] = [];
  private currentSessionId: string | null = null;

  setOutput(sessionId: string, output: string[]) {
    this.currentSessionId = sessionId;
    this.currentOutput = output;
    this.listeners.forEach(listener => listener(output, sessionId));
  }

  appendOutput(sessionId: string, line: string) {
    if (this.currentSessionId === sessionId) {
      this.currentOutput = [...this.currentOutput, line];
      this.listeners.forEach(listener => listener(this.currentOutput, sessionId));
    }
  }

  getOutput(sessionId: string): string[] {
    if (this.currentSessionId === sessionId) {
      return this.currentOutput;
    }
    return [];
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  subscribe(listener: (output: string[], sessionId: string) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state if available
    if (this.currentSessionId) {
      listener(this.currentOutput, this.currentSessionId);
    }
    return () => this.listeners.delete(listener);
  }

  clear(sessionId: string) {
    if (this.currentSessionId === sessionId) {
      this.currentOutput = [];
      this.listeners.forEach(listener => listener([], sessionId));
    }
  }
}

export const aiTerminalOutputStore = new AITerminalOutputStore();

export const TerminalView: React.FC<TerminalViewProps> = memo(({ 
  isOpen, 
  onClose, 
  onSendCommand,
  autoCreateAgentLog,
  onAgentLogCreated,
  onAgentLogClosed,
}) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [terminalOutputs, setTerminalOutputs] = useState<Map<string, string[]>>(new Map());
  const isCreatingInitialTab = useRef(false);
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const tabsRef = useRef<TerminalTab[]>([]);
  
  // Keep tabsRef in sync with tabs
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  
  // Resizable height state
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(TERMINAL_HEIGHT_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Handle terminal output events
  useEffect(() => {
    const handleTerminalData = (event: CustomEvent) => {
      const { sessionId, data, type } = event.detail;
      
      console.log('[TerminalView] Received terminal-data:', { sessionId, type, data: data.substring(0, 50) });
      
      // Check if this is an AI-created terminal
      const isAITerminal = terminalContextStore.isAICreated(sessionId);
      
      // Don't filter input commands (when AI executes commands)
      if (type === 'input') {
        setTerminalOutputs(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(sessionId) || [];
          const newOutput = [...existing, data];
          newMap.set(sessionId, newOutput);
          
          // Sync to AI terminal store if this is an AI terminal
          if (isAITerminal) {
            aiTerminalOutputStore.setOutput(sessionId, newOutput);
          }
          
          return newMap;
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          const ref = terminalRefs.current.get(sessionId);
          if (ref) {
            ref.scrollTop = ref.scrollHeight;
          }
        }, 10);
        return;
      }
      
      // Filter out bash version and other startup messages for output
      const filteredData = data
        .replace(/^GNU bash.*\n?/gm, '')
        .replace(/^bash-.*\$\s*/gm, '')
        .replace(/^\s*\$\s*$/gm, '');
      
      if (!filteredData.trim()) return;
      
      setTerminalOutputs(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(sessionId) || [];
        const newOutput = [...existing, filteredData];
        newMap.set(sessionId, newOutput);
        
        // Sync to AI terminal store if this is an AI terminal
        if (isAITerminal) {
          aiTerminalOutputStore.setOutput(sessionId, newOutput);
        }
        
        return newMap;
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        const ref = terminalRefs.current.get(sessionId);
        if (ref) {
          ref.scrollTop = ref.scrollHeight;
        }
      }, 10);
    };

    window.addEventListener('terminal-data', handleTerminalData as EventListener);
    return () => {
      window.removeEventListener('terminal-data', handleTerminalData as EventListener);
    };
  }, []);

  // Handle AI-created terminals
  useEffect(() => {
    const handleAITerminalCreated = (event: CustomEvent) => {
      const { sessionId, type, createdBy, workspaceRoot } = event.detail;
      
      // Check if tab already exists
      const existingTab = tabs.find(t => t.sessionId === sessionId);
      if (existingTab) {
        return;
      }

      // Create new tab for AI-created terminal
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}-${sessionId}`,
        title: 'Shell',
        type,
        sessionId,
        createdBy,
        workspaceRoot,
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    };

    const handleFocusTerminalSession = (event: CustomEvent) => {
      const { sessionId } = event.detail;
      
      // Find the tab with this session ID
      const tab = tabs.find(t => t.sessionId === sessionId);
      if (tab) {
        setActiveTabId(tab.id);
      }
    };

    window.addEventListener('ai-terminal-created', handleAITerminalCreated as EventListener);
    window.addEventListener('focus-terminal-session', handleFocusTerminalSession as EventListener);
    return () => {
      window.removeEventListener('ai-terminal-created', handleAITerminalCreated as EventListener);
      window.removeEventListener('focus-terminal-session', handleFocusTerminalSession as EventListener);
    };
  }, [tabs]);

  // Cleanup sessions on unmount
  useEffect(() => {
    return () => {
      tabsRef.current.forEach(tab => {
        if (tab.type === 'agent-log') {
          agentService.closeSession(tab.sessionId).catch(console.error);
        } else {
          terminalService.closeSession(tab.sessionId).catch(console.error);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount, not when tabs change

  // Expose send command function (but not for AI terminals)
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.createdBy !== 'ai') {
      onSendCommand((command: string) => {
        // Add command to output with > prefix
        setTerminalOutputs(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(activeTab.sessionId) || [];
          newMap.set(activeTab.sessionId, [...existing, `> ${command}`]);
          return newMap;
        });
        terminalService.writeToSession(activeTab.sessionId, command + '\n').catch(console.error);
      });
    } else {
      // For AI terminals, provide a no-op function
      onSendCommand(() => {
        console.log('[TerminalView] Input blocked - this is an AI-controlled terminal');
      });
    }
  }, [activeTabId, tabs, onSendCommand]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startY: e.clientY, startHeight: height };
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.startHeight + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(TERMINAL_HEIGHT_KEY, height.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, height]);

  const handleCreateTab = useCallback(async (type: 'shell' | 'codex' | 'skhoot-log' | 'agent-log') => {
    if (isCreatingTab) {
      console.log('[TerminalView] Already creating a tab, skipping...');
      return;
    }
    
    setIsCreatingTab(true);
    
    const timeoutId = setTimeout(() => {
      console.error('[TerminalView] Session creation timed out after 10s');
      setIsCreatingTab(false);
    }, 10000);
    
    try {
      let sessionId: string;
      
      if (type === 'agent-log') {
        // Create agent session
        const agentSessionId = `agent-${Date.now()}`;
        await agentService.createSession(agentSessionId);
        sessionId = agentSessionId;
      } else {
        // Create terminal session
        sessionId = await terminalService.createSession(type);
      }
      
      clearTimeout(timeoutId);
      
      // Check if this terminal was created by AI
      const context = terminalContextStore.get(sessionId);
      
      const titles: Record<string, string> = {
        'shell': 'Shell',
        'codex': 'Codex',
        'skhoot-log': 'Skhoot Log',
        'agent-log': 'Agent Log',
      };
      
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        title: titles[type] || 'Terminal',
        type,
        sessionId,
        createdBy: context?.createdBy || 'user',
        workspaceRoot: context?.workspaceRoot,
      };
      
      setTabs(prev => [...prev, newTab]);
      queueMicrotask(() => setActiveTabId(newTab.id));
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[TerminalView] Failed to create terminal tab:', error);
      alert(`Failed to create terminal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingTab(false);
    }
  }, [isCreatingTab]);

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      if (tab.type === 'agent-log') {
        await agentService.closeSession(tab.sessionId);
        onAgentLogClosed?.();
      } else {
        await terminalService.closeSession(tab.sessionId);
      }
      setTabs(prev => prev.filter(t => t.id !== tabId));
      
      if (activeTabId === tabId) {
        const remainingTabs = tabs.filter(t => t.id !== tabId);
        // Prefer shell tabs over agent-log tabs
        const shellTabs = remainingTabs.filter(t => t.type !== 'agent-log');
        if (shellTabs.length > 0) {
          setActiveTabId(shellTabs[0].id);
        } else if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[0].id);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to close terminal tab:', error);
    }
  }, [tabs, activeTabId, onClose, onAgentLogClosed]);

  const handleCopyOutput = useCallback((sessionId: string) => {
    const output = terminalOutputs.get(sessionId)?.join('\n') || '';
    navigator.clipboard.writeText(output);
  }, [terminalOutputs]);

  const handleClearOutput = useCallback((sessionId: string) => {
    setTerminalOutputs(prev => {
      const newMap = new Map(prev);
      newMap.set(sessionId, []);
      return newMap;
    });
    // Also clear AI terminal store if this is an AI terminal
    if (terminalContextStore.isAICreated(sessionId)) {
      aiTerminalOutputStore.clear(sessionId);
    }
  }, []);

  // Toggle AI terminal visibility - shows the AI-created terminal (read-only view)
  const handleToggleAITerminal = useCallback(() => {
    const aiTab = tabs.find(t => t.createdBy === 'ai' && t.type !== 'agent-log');
    if (!aiTab) {
      console.log('[TerminalView] No AI terminal exists yet');
      return;
    }
    
    const currentTab = tabs.find(t => t.id === activeTabId);
    const isCurrentlyViewingAI = currentTab?.createdBy === 'ai' && currentTab?.type !== 'agent-log';
    
    if (isCurrentlyViewingAI) {
      // Currently viewing AI terminal - switch back to first user shell tab
      const userShellTab = tabs.find(t => t.createdBy !== 'ai' && t.type !== 'agent-log');
      if (userShellTab) {
        setActiveTabId(userShellTab.id);
      } else {
        console.log('[TerminalView] No user terminal to switch to');
      }
    } else {
      // Not viewing AI terminal - switch to it
      setActiveTabId(aiTab.id);
    }
  }, [tabs, activeTabId]);

  // Create initial shell tab when component mounts - ALWAYS create shell first
  useEffect(() => {
    if (isOpen && tabs.length === 0 && !isCreatingInitialTab.current) {
      isCreatingInitialTab.current = true;
      handleCreateTab('shell').finally(() => {
        setTimeout(() => {
          isCreatingInitialTab.current = false;
        }, 1000);
      });
    }
  }, [isOpen, tabs.length, handleCreateTab]);

  /* COMMENTED OUT: Old agent log auto-creation - replaced by AI Terminal
  // Auto-create agent log tab when autoCreateAgentLog is provided (but don't switch to it)
  const autoCreateAgentLogRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoCreateAgentLog || !isOpen) return;
    
    // Check if we already have an agent-log tab for this session
    const existingTab = tabs.find(t => t.type === 'agent-log' && t.sessionId === autoCreateAgentLog);
    if (existingTab) {
      // Don't auto-switch to agent log - user can click the bot icon to view it
      return;
    }
    
    // Check if we're already creating this session
    if (autoCreateAgentLogRef.current === autoCreateAgentLog) return;
    autoCreateAgentLogRef.current = autoCreateAgentLog;
    
    // Create the agent log tab with the provided session ID (but don't activate it)
    const createAgentLogTab = async () => {
      try {
        // Check if session already exists in agentService
        const hasSession = agentService.hasSession(autoCreateAgentLog);
        
        if (!hasSession) {
          // Session doesn't exist, create it
          await agentService.createSession(autoCreateAgentLog);
        }
        
        const newTab: TerminalTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          title: 'Agent Log',
          type: 'agent-log',
          sessionId: autoCreateAgentLog,
        };
        
        setTabs(prev => [...prev, newTab]);
        // Don't set active tab - keep the shell tab active
        onAgentLogCreated?.(newTab.id);
      } catch (error) {
        console.error('[TerminalView] Failed to auto-create agent log tab:', error);
        autoCreateAgentLogRef.current = null;
      }
    };
    
    createAgentLogTab();
  }, [autoCreateAgentLog, isOpen, tabs, onAgentLogCreated]);
  */

  // Memoize computed values
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeOutput = useMemo(() => activeTab ? terminalOutputs.get(activeTab.sessionId) || [] : [], [activeTab, terminalOutputs]);
  
  // Memoize filtered tabs for rendering (exclude agent-log tabs from tab bar)
  const visibleTabs = useMemo(() => tabs.filter(tab => tab.type !== 'agent-log'), [tabs]);
  
  // Check if there's an AI terminal available
  const aiTerminalTab = useMemo(() => 
    tabs.find(t => t.createdBy === 'ai' && t.type !== 'agent-log'), 
    [tabs]
  );
  
  // Check if currently viewing AI terminal
  const isViewingAITerminal = activeTab?.createdBy === 'ai' && activeTab?.type !== 'agent-log';

  if (!isOpen) return null;

  // Calculate bottom offset: prompt panel offset + prompt panel height (padding + quick actions + input row)
  // Quick actions ~60px, input row ~50px, padding ~24px = ~134px total prompt area height
  const bottomOffset = 'calc(var(--prompt-panel-bottom-offset) + 150px)';

  return (
    <div 
      className="fixed left-0 right-0 pointer-events-auto z-40"
      style={{
        paddingLeft: 'var(--prompt-area-x)',
        paddingRight: 'var(--prompt-area-x)',
        bottom: bottomOffset,
        animation: isResizing ? 'none' : 'terminalSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <style>{`
        @keyframes terminalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div 
        className="overflow-hidden backdrop-blur-sm"
        style={{
          borderRadius: 'var(--prompt-panel-radius)',
          height: `${height}px`,
          background: 'transparent',
        }}
      >
        {/* Unified Header with Resize Handle and Tabs */}
        <div 
          className="flex items-center justify-between"
          style={{
            padding: 'calc(var(--prompt-panel-padding) * 0.5) var(--prompt-panel-radius)',
          }}
        >
          {/* Resize Handle */}
          <div
            className={`flex items-center justify-center px-2 cursor-ns-resize transition-colors ${isResizing ? 'bg-purple-500/20' : 'hover:bg-white/5'} rounded`}
            onMouseDown={handleResizeStart}
          >
            <GripHorizontal size={16} className="opacity-40" style={{ color: 'var(--text-secondary)' }} />
          </div>

          {/* Tabs - Only show shell tabs, not agent-log tabs */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto ml-2">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all text-sm
                  ${activeTabId === tab.id 
                    ? 'bg-purple-500/20' 
                    : 'hover:bg-white/5'
                  }
                `}
                style={{
                  color: activeTabId === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => setActiveTabId(tab.id)}
              >
                <Terminal size={14} />
                <span className="font-medium font-jakarta">{tab.title}</span>
                {tab.createdBy === 'ai' && (
                  <div 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30"
                    title="Created by AI Agent"
                  >
                    <Bot size={10} className="text-cyan-400" />
                    <span className="text-xs text-cyan-400 font-medium">AI</span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </button>
            ))}
            <button
              onClick={() => handleCreateTab('shell')}
              disabled={isCreatingTab}
              className={`p-1.5 rounded-xl transition-all hover:bg-emerald-500/10 hover:text-emerald-500 ${isCreatingTab ? 'opacity-50 cursor-wait' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
              title="New Terminal"
            >
              <Plus size={16} className={isCreatingTab ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 ml-4">
            {activeTab && activeTab.type !== 'agent-log' && (
              <>
                <button
                  onClick={() => handleCopyOutput(activeTab.sessionId)}
                  className="p-1.5 rounded-xl transition-all hover:bg-cyan-500/10 hover:text-cyan-500"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Copy Output"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleClearOutput(activeTab.sessionId)}
                  className="p-1.5 rounded-xl transition-all hover:bg-amber-500/10 hover:text-amber-500"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Clear Output"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button
              onClick={handleToggleAITerminal}
              disabled={!aiTerminalTab}
              className={`p-1.5 rounded-xl transition-all ${
                isViewingAITerminal
                  ? 'bg-accent/20 text-accent' 
                  : aiTerminalTab 
                    ? 'hover:bg-accent/10 hover:text-accent'
                    : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ color: isViewingAITerminal ? undefined : 'var(--text-secondary)' }}
              title={
                !aiTerminalTab 
                  ? 'No AI Terminal (AI hasn\'t used terminal yet)' 
                  : isViewingAITerminal 
                    ? 'Back to User Terminal' 
                    : 'View AI Terminal'
              }
            >
              <Bot size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500"
              style={{ color: 'var(--text-secondary)' }}
              title="Close Terminal"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="overflow-hidden" style={{ height: 'calc(100% - 48px)' }}>
          {activeTab ? (
            /* COMMENTED OUT: Old AgentLogTab - replaced by AI Terminal view
            activeTab.type === 'agent-log' ? (
              <AgentLogTab 
                sessionId={activeTab.sessionId} 
                isActive={activeTabId === activeTab.id}
              />
            ) : */
            (
              <div className="h-full flex flex-col">
                {/* Terminal Header with Workspace Root */}
                {(activeTab.workspaceRoot || activeTab.createdBy === 'ai') && (
                  <div 
                    className={`px-4 py-2 border-b flex items-center justify-between border-glass-border ${
                      activeTab.createdBy === 'ai' ? 'bg-accent/10' : 'bg-background-secondary'
                    }`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Terminal size={14} />
                      {activeTab.workspaceRoot && (
                        <span className="text-xs font-mono">
                          Workspace: {activeTab.workspaceRoot}
                        </span>
                      )}
                    </div>
                    {activeTab.createdBy === 'ai' && (
                      <div className="flex items-center gap-2 text-xs text-accent">
                        <Bot size={12} />
                        <span>AI Terminal (Read-only)</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Terminal Output Area */}
                <div 
                  ref={(el) => {
                    if (el) terminalRefs.current.set(activeTab.sessionId, el);
                  }}
                  className="flex-1 overflow-y-auto p-4 font-mono text-sm"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  {activeOutput.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-purple-500">&gt;</span> waiting for your input
                    </div>
                  ) : (
                    activeOutput.map((line, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-center">
                <Terminal size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-jakarta">{isCreatingTab ? 'Creating terminal...' : 'No terminal session active'}</p>
                <button
                  onClick={() => handleCreateTab('shell')}
                  disabled={isCreatingTab}
                  className={`mt-3 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all text-sm font-jakarta ${isCreatingTab ? 'opacity-50 cursor-wait' : ''}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  Create New Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TerminalView.displayName = 'TerminalView';
