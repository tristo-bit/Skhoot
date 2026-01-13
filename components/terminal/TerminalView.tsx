import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, X, Plus, Copy, Trash2, GripHorizontal } from 'lucide-react';
import { terminalService } from '../../services/terminalService';

interface TerminalTab {
  id: string;
  title: string;
  type: 'shell' | 'codex' | 'skhoot-log';
  sessionId: string;
}

interface TerminalViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSendCommand: (sendFn: (command: string) => void) => void;
}

const TERMINAL_HEIGHT_KEY = 'skhoot-terminal-height';
const DEFAULT_HEIGHT = 250;
const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;

export const TerminalView: React.FC<TerminalViewProps> = ({ isOpen, onClose, onSendCommand }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [terminalOutputs, setTerminalOutputs] = useState<Map<string, string[]>>(new Map());
  const isCreatingInitialTab = useRef(false);
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  
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
      const { sessionId, data } = event.detail;
      
      // Filter out bash version and other startup messages
      const filteredData = data
        .replace(/^GNU bash.*\n?/gm, '')
        .replace(/^bash-.*\$\s*/gm, '')
        .replace(/^\s*\$\s*$/gm, '');
      
      if (!filteredData.trim()) return;
      
      setTerminalOutputs(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(sessionId) || [];
        newMap.set(sessionId, [...existing, filteredData]);
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

  // Cleanup sessions on unmount
  useEffect(() => {
    return () => {
      tabs.forEach(tab => {
        terminalService.closeSession(tab.sessionId).catch(console.error);
      });
    };
  }, [tabs]);

  // Expose send command function
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
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

  const handleCreateTab = useCallback(async (type: 'shell' | 'codex' | 'skhoot-log') => {
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
      const sessionId = await terminalService.createSession(type);
      clearTimeout(timeoutId);
      
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        title: type === 'shell' ? 'Shell' : type === 'codex' ? 'Codex' : 'Skhoot Log',
        type,
        sessionId,
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
      await terminalService.closeSession(tab.sessionId);
      setTabs(prev => prev.filter(t => t.id !== tabId));
      
      if (activeTabId === tabId) {
        const remainingTabs = tabs.filter(t => t.id !== tabId);
        if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[0].id);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to close terminal tab:', error);
    }
  }, [tabs, activeTabId, onClose]);

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
  }, []);

  // Create initial shell tab when component mounts
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

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeOutput = activeTab ? terminalOutputs.get(activeTab.sessionId) || [] : [];

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 pointer-events-auto z-10"
      style={{
        paddingLeft: 'var(--prompt-area-x)',
        paddingRight: 'var(--prompt-area-x)',
        paddingBottom: 'var(--prompt-area-x)',
        transform: 'translateY(calc(-1 * var(--prompt-panel-bottom-offset) - var(--prompt-panel-padding) * 2 - 60px))',
        animation: isResizing ? 'none' : 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(calc(-1 * var(--prompt-panel-bottom-offset) - var(--prompt-panel-padding) * 2 - 40px));
          }
          to {
            opacity: 1;
            transform: translateY(calc(-1 * var(--prompt-panel-bottom-offset) - var(--prompt-panel-padding) * 2 - 60px));
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
        {/* Resize Handle */}
        <div
          className={`flex items-center justify-center h-6 cursor-ns-resize transition-colors ${isResizing ? 'bg-purple-500/20' : 'hover:bg-white/5'}`}
          onMouseDown={handleResizeStart}
        >
          <GripHorizontal size={16} className="opacity-40" style={{ color: 'var(--text-secondary)' }} />
        </div>

        {/* Terminal Tabs - No border */}
        <div 
          className="flex items-center justify-between"
          style={{
            padding: 'calc(var(--prompt-panel-padding) * 0.5) var(--prompt-panel-radius)',
          }}
        >
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {tabs.map(tab => (
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
            {activeTab && (
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
        <div className="overflow-hidden" style={{ height: 'calc(100% - 72px)' }}>
          {activeTab ? (
            <div 
              ref={(el) => {
                if (el) terminalRefs.current.set(activeTab.sessionId, el);
              }}
              className="h-full overflow-y-auto p-4 font-mono text-sm"
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
};
