import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, X, Plus, Search, Copy, Trash2 } from 'lucide-react';
import { terminalService } from '../../services/terminalService';

interface TerminalTab {
  id: string;
  title: string;
  type: 'shell' | 'codex' | 'skhoot-log';
  sessionId: string;
}

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ isOpen, onClose }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [terminalOutputs, setTerminalOutputs] = useState<Map<string, string[]>>(new Map());

  const handleCreateTab = useCallback(async (type: 'shell' | 'codex' | 'skhoot-log') => {
    try {
      const sessionId = await terminalService.createSession(type);
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}`,
        title: type === 'shell' ? 'Shell' : type === 'codex' ? 'Codex' : 'Skhoot Log',
        type,
        sessionId,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      console.error('Failed to create terminal tab:', error);
    }
  }, []);

  // Create initial shell tab when panel opens
  useEffect(() => {
    if (isOpen && tabs.length === 0) {
      handleCreateTab('shell');
    }
  }, [isOpen, tabs.length, handleCreateTab]);

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

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await terminalService.closeSession(tab.sessionId);
      setTabs(prev => prev.filter(t => t.id !== tabId));
      
      // Switch to another tab if closing active tab
      if (activeTabId === tabId) {
        const remainingTabs = tabs.filter(t => t.id !== tabId);
        setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
      }
    } catch (error) {
      console.error('Failed to close terminal tab:', error);
    }
  }, [tabs, activeTabId]);

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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>, sessionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget.value;
      if (input.trim()) {
        try {
          await terminalService.writeToSession(sessionId, input + '\n');
          e.currentTarget.value = '';
        } catch (error) {
          console.error('Failed to write to terminal:', error);
        }
      }
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeOutput = activeTab ? terminalOutputs.get(activeTab.sessionId) || [] : [];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-50 animate-slide-up glass-elevated"
      style={{ 
        height: '50vh',
        borderColor: 'var(--glass-border)'
      }}
    >
      {/* Tab Bar */}
      <div 
        className="flex items-center justify-between border-b px-4 py-2 glass-subtle"
        style={{
          borderColor: 'var(--glass-border)'
        }}
      >
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all
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
              <span className="text-sm font-medium">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                className="hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => handleCreateTab('shell')}
            className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
            title="New Terminal"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-purple-500/10 hover:text-purple-500"
            title="Search"
          >
            <Search size={16} />
          </button>
          {activeTab && (
            <>
              <button
                onClick={() => handleCopyOutput(activeTab.sessionId)}
                className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-cyan-500/10 hover:text-cyan-500"
                title="Copy Output"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleClearOutput(activeTab.sessionId)}
                className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-amber-500/10 hover:text-amber-500"
                title="Clear Output"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-red-500/10 hover:text-red-500"
            title="Close Terminal"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div 
          className="px-4 py-2 border-b glass-subtle"
          style={{
            borderColor: 'var(--glass-border)'
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in terminal..."
              className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 glass-subtle"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
            <button
              onClick={() => setShowSearch(false)}
              className="p-2 rounded-lg glass-subtle hover:glass-elevated transition-all hover:bg-red-500/10 hover:text-red-500"
              title="Close Search"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
        {activeTab ? (
          <div className="h-full flex flex-col">
            {/* Output Area */}
            <div 
              ref={(el) => {
                if (el) terminalRefs.current.set(activeTab.sessionId, el);
              }}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm glass-subtle"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
                color: 'var(--text-primary)'
              }}
            >
              {activeOutput.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {line}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div 
              className="border-t p-4 glass-subtle"
              style={{
                borderColor: 'var(--glass-border)'
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-purple-500 font-mono">$</span>
                <textarea
                  rows={1}
                  onKeyDown={(e) => handleKeyDown(e, activeTab.sessionId)}
                  placeholder="Type command and press Enter..."
                  className="flex-1 bg-transparent border-none font-mono text-sm focus:outline-none resize-none placeholder:text-text-secondary"
                  style={{ minHeight: '24px', maxHeight: '120px', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <Terminal size={48} className="mx-auto mb-4 opacity-40" />
              <p>No terminal session active</p>
              <button
                onClick={() => handleCreateTab('shell')}
                className="mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-600 dark:text-purple-300 transition-all"
              >
                Create New Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
