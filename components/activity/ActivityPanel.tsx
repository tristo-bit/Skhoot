// Activity Panel - Main component that composes UI and hooks
import React from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { BackButton, CloseButton } from '../buttonFormat';
import { useActivityLogs } from './hooks/useActivityLogs';
import { activityLogger } from '../../services/activityLogger';
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

  const handleClearLogs = () => {
    if (confirm('Clear all activity logs? This cannot be undone.')) {
      activityLogger.clearLogs();
    }
  };

  const panel = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[92vw] max-w-[520px] h-[85vh] rounded-3xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300 glass-elevated flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0">
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
        <div className="flex-shrink-0">
          <ActivityFilterBar 
            activeFilter={filter} 
            onFilterChange={setFilter} 
          />
        </div>

        {/* Logs */}
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2">
          {isEmpty ? (
            <EmptyActivityState />
          ) : (
            logs.map(log => (
              <ActivityLogItem key={log.id} log={log} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-2 flex-shrink-0 border-t border-white/5">
          <button 
            onClick={exportJSON}
            disabled={isEmpty}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold font-jakarta text-text-secondary hover:glass-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Download size={14} />
            Export Activity Log
          </button>
          <button 
            onClick={handleClearLogs}
            disabled={isEmpty}
            className="px-4 py-2.5 rounded-xl text-[11px] font-bold font-jakarta text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Clear all logs"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to escape parent stacking context
  return createPortal(panel, document.body);
};

export default ActivityPanel;
