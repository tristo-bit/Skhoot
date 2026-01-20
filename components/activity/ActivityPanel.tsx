// Activity Panel - Main component that composes UI and hooks
import React from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../ui';
import { BackButton } from '../buttonFormat';
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

  return (
    <Modal
      onClose={onClose}
      panelClassName="activity-panel"
      headerClassName="activity-panel-header"
      bodyClassName="activity-panel-body"
      footerClassName="activity-panel-footer"
      closeAriaLabel="Close activity log"
      headerContent={(
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && <BackButton onClick={onBack} />}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black font-jakarta text-text-primary">
              Activity Log
            </h2>
            <p className="text-xs font-medium text-text-secondary font-jakarta mt-0.5">
              Track all Skhoot actions and outputs
            </p>
          </div>
        </div>
      )}
      footer={(
        <div className="flex gap-2 w-full">
          <button 
            onClick={exportJSON}
            disabled={isEmpty}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold font-jakarta text-text-secondary hover:glass-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Download size={14} />
            Export Activity Log
          </button>
          <button 
            onClick={handleClearLogs}
            disabled={isEmpty}
            className="px-4 py-2.5 rounded-xl text-xs font-bold font-jakarta text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Clear all logs"
          >
            Clear
          </button>
        </div>
      )}
    >
      {/* Filters */}
      <div className="flex-shrink-0 -mx-6 px-6 border-b border-glass-border pb-3">
        <ActivityFilterBar 
          activeFilter={filter} 
          onFilterChange={setFilter} 
        />
      </div>

      {/* Logs */}
      <div className="flex-1 -mx-6 px-6 py-4 overflow-y-auto no-scrollbar space-y-2">
        {isEmpty ? (
          <EmptyActivityState />
        ) : (
          logs.map(log => (
            <ActivityLogItem key={log.id} log={log} />
          ))
        )}
      </div>
    </Modal>
  );
};

export default ActivityPanel;
