import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, X, Plus, Copy, Trash2 } from 'lucide-react';
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
  onSendCommand: (command: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ isOpen, onClose, onSendCommand }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [terminalOutputs, setTerminalOutputs] = useState<Map<string, string[]>>(new Map());

  // Handle terminal output events
  useEffect(() => {
    const handleTerminalData = (event: CustomEvent) => {
      const { sessionId, data } = event.detail;
      setTerminalOutputs(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(sessionId) || [];
        newMap.set(sessionId, [...existing, data]);
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
        terminalService.writeToSession(activeTab.sessionId, command + '\n').catch(console.error);
      });
    }
  }, [activeTabId, tabs, onSendCommand]);

  const handleCreateTab = useCallback(async (type: 'shell' | 'codex' | 'skhoot-log') => {
    console.log('[TerminalView] handleCreateTab called with type:', type);
    try {
      console.log('[TerminalView] Calling terminalService.createSession...');
      const sessionId = await terminalService.createSession(type);
      console.log('[TerminalView] Session created with ID:', sessionId);
      
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}`,
        title: type === 'shell' ? 'Shell' : type === 'codex' ? 'Codex' : 'Skhoot Log',
        type,
        sessionId,
      };
      console.log('[TerminalView] New tab created:', newTab);
      
      setTabs(prev => {
        console.log('[TerminalView] Previous tabs:', prev);
        const newTabs = [...prev, newTab];
        console.log('[TerminalView] New tabs:', newTabs);
        return newTabs;
      });
      setActiveTabId(newTab.id);
      console.log('[TerminalView] Active tab set to:', newTab.id);
    } catch (error) {
      console.error('[TerminalView] Failed to create terminal tab:', error);
      // Show user-friendly error
      alert(`Failed to create terminal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await terminalService.closeSession(tab.sessionId);
      setTabs(prev => prev.filter(t => t.id !== tabId));
      
      // Switch to another tab if closing active tab
      if (activeTabId === tabId) {
        const remainingTabs = tabs.filter(t => t.id !== tabId);
        if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[0].id);
        } else {
          // No tabs left, close terminal view
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
    if (isOpen && tabs.length === 0) {
      handleCreateTab('shell');
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
        animation: 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
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
        className="glass-elevated shadow-2xl overflow-hidden"
        style={{
          borderRadius: 'var(--prompt-panel-radius)',
          height: 'calc(var(--prompt-panel-padding) * 2 + 180px)', // 3x prompt area height
        }}
      >
        {/* Terminal Tabs */}
        <div 
          className="flex items-center justify-between border-b glass-subtle"
          style={{
            padding: 'calc(var(--prompt-panel-padding) * 0.5) var(--prompt-panel-radius)',
            borderColor: 'var(--glass-border)'
          }}
        >
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all text-sm
                  ${activeTabId === tab.id 
                    ? 'bg-purple-500/20 border border-purple-500/30' 
                    : 'glass-subtle hover:glass-elevated'
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
              className="p-1.5 rounded-xl glass-subtle hover:glass-elevated transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
              title="New Terminal"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 ml-4">
            {activeTab && (
              <>
                <button
                  onClick={() => handleCopyOutput(activeTab.sessionId)}
                  className="p-1.5 rounded-xl glass-subtle hover:glass-elevated transition-all hover:bg-cyan-500/10 hover:text-cyan-500"
                  title="Copy Output"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleClearOutput(activeTab.sessionId)}
                  className="p-1.5 rounded-xl glass-subtle hover:glass-elevated transition-all hover:bg-amber-500/10 hover:text-amber-500"
                  title="Clear Output"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl glass-subtle hover:glass-elevated transition-all hover:bg-red-500/10 hover:text-red-500"
              title="Close Terminal"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="h-full overflow-hidden" style={{ height: 'calc(100% - 48px)' }}>
          {activeTab ? (
            <div 
              ref={(el) => {
                if (el) terminalRefs.current.set(activeTab.sessionId, el);
              }}
              className="h-full overflow-y-auto p-4 font-mono text-sm glass-subtle"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
                color: 'var(--text-primary)',
              }}
            >
              {activeOutput.length === 0 ? (
                <div className="text-center mt-8" style={{ color: 'var(--text-secondary)' }}>
                  <Terminal size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-jakarta">Terminal ready. Type a command below and press Enter.</p>
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
                <p className="text-sm font-jakarta">No terminal session active</p>
                <button
                  onClick={() => handleCreateTab('shell')}
                  className="mt-3 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all border border-purple-500/30 text-sm font-jakarta"
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
