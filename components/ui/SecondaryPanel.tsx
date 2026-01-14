/**
 * SecondaryPanel - Shared floating panel component for terminal-style interfaces
 * Used by TerminalView, FileExplorerPanel, WorkflowsPanel, etc.
 * Positioned above the PromptArea with consistent styling
 * Rendered via portal to avoid parent overflow clipping
 */
import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, GripHorizontal } from 'lucide-react';

export interface SecondaryPanelTab {
  id: string;
  title: string;
  icon: ReactNode;
}

interface SecondaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tabs?: SecondaryPanelTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
  headerActions?: ReactNode;
  /** Additional content to render in the tab bar (e.g., add buttons) */
  tabBarExtra?: ReactNode;
  storageKey?: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  /** Animation keyframe name - must be unique per panel type */
  animationName?: string;
}

export const SecondaryPanel: React.FC<SecondaryPanelProps> = ({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  onTabChange,
  children,
  headerActions,
  tabBarExtra,
  storageKey = 'skhoot-secondary-panel-height',
  defaultHeight = 300,
  minHeight = 150,
  maxHeight = 600,
  animationName = 'secondaryPanelSlideUp',
}) => {
  // Resizable height state
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : defaultHeight;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

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
      const newHeight = Math.min(maxHeight, Math.max(minHeight, resizeRef.current.startHeight + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(storageKey, height.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, height, storageKey, maxHeight, minHeight]);

  if (!isOpen) return null;

  // Calculate content height based on whether we have tabs
  const headerHeight = tabs && tabs.length > 0 ? 85 : 34; // 85px with tabs, 34px without (just resize handle + close)
  
  // Calculate bottom offset: prompt panel offset + prompt panel height (padding + quick actions + input row)
  // Quick actions ~60px, input row ~50px, padding ~24px = ~150px total prompt area height
  const bottomOffset = 'calc(var(--prompt-panel-bottom-offset) + 150px)';

  const panel = (
    <div 
      className="fixed left-0 right-0 pointer-events-auto z-40"
      style={{
        paddingLeft: 'var(--prompt-area-x)',
        paddingRight: 'var(--prompt-area-x)',
        bottom: bottomOffset,
        animation: isResizing ? 'none' : `${animationName} 0.3s cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <style>{`
        @keyframes ${animationName} {
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
        className="overflow-hidden backdrop-blur-sm glass-elevated"
        style={{
          borderRadius: 'var(--prompt-panel-radius)',
          height: `${height}px`,
        }}
      >
        {/* Resize Handle */}
        <div
          className={`flex items-center justify-center h-6 cursor-ns-resize transition-colors ${isResizing ? 'bg-purple-500/20' : 'hover:bg-white/5'}`}
          onMouseDown={handleResizeStart}
        >
          <GripHorizontal size={16} className="opacity-40" style={{ color: 'var(--text-secondary)' }} />
        </div>

        {/* Tab Bar (if tabs provided) */}
        {tabs && tabs.length > 0 ? (
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
                  onClick={() => onTabChange?.(tab.id)}
                >
                  {tab.icon}
                  <span className="font-medium font-jakarta">{tab.title}</span>
                </button>
              ))}
              {tabBarExtra}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 ml-4">
              {headerActions}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500"
                style={{ color: 'var(--text-secondary)' }}
                title="Close Panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Simple header without tabs */
          <div 
            className="flex items-center justify-end"
            style={{
              padding: '0 var(--prompt-panel-radius) calc(var(--prompt-panel-padding) * 0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              {headerActions}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500"
                style={{ color: 'var(--text-secondary)' }}
                title="Close Panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Panel Content */}
        <div className="overflow-hidden" style={{ height: `calc(100% - ${headerHeight}px)` }}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render via portal to avoid parent overflow clipping
  return createPortal(panel, document.body);
};

export default SecondaryPanel;
