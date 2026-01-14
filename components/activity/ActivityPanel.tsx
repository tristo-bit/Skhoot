// Activity Panel - Main component that composes UI and hooks
import React from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { BackButton, CloseButton } from '../buttonFormat';
import { useActivityLogs } from './hooks/useActivityLogs';
import { 
  ActivityFilterBar, 
  ActivityLogItem, 
  EmptyActivityState 
} from './ui';

interface ActivityPanelProps {
  onClose: () => void;
  onBack?: () => void;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ onClose, onBack }) => {
  const { 
    logs, 
    filter, 
    setFilter, 
    exportJSON,
    isEmpty 
  } = useActivityLogs();

  const panel = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[420px] max-h-[85%] rounded-3xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300 glass-elevated"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack || onClose} />
            <div>
              <h2 className="text-lg font-black font-jakarta text-text-primary">
                Activity Log
              </h2>
              <p className="text-[10px] font-medium text-text-secondary font-jakarta mt-0.5">
                Track all Skhoot actions and outputs
              </p>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Filters */}
        <ActivityFilterBar 
          activeFilter={filter} 
          onFilterChange={setFilter} 
        />

        {/* Logs */}
        <div className="p-4 overflow-y-auto max-h-[400px] no-scrollbar space-y-2">
          {isEmpty ? (
            <EmptyActivityState />
          ) : (
            logs.map(log => (
              <ActivityLogItem key={log.id} log={log} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3">
          <button 
            onClick={exportJSON}
            disabled={isEmpty}
            className="w-full py-2.5 rounded-xl text-[11px] font-bold font-jakarta text-text-secondary hover:glass-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export Activity Log
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to escape parent stacking context
  return createPortal(panel, document.body);
};

export default ActivityPanel;
