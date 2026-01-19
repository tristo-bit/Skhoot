// Single activity log item - reusable UI component
import React, { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { ActivityLog } from '../../../services/activityLogger';
import { formatRelativeTime } from '../../../services/activityLogger';
import { ActivityIcon, getActivityColor } from './ActivityIcon';
import { ActivityStatus } from './ActivityStatus';
import { SearchDetailModal } from './SearchDetailModal';

interface ActivityLogItemProps {
  log: ActivityLog;
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log }) => {
  const [showDetail, setShowDetail] = useState(false);
  const bgColor = `${getActivityColor(log.action)}50`;
  
  // Check if this is a search action that can show details
  const isSearchAction = log.action.includes('Search');
  const isClickable = isSearchAction && log.searchMetadata;
  
  // Check if we can navigate to the chat/message
  const canNavigate = log.chatId && log.messageId;

  const handleClick = () => {
    if (isClickable) {
      setShowDetail(true);
    }
  };

  const handleGoToMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canNavigate) {
      // Dispatch custom event to navigate to chat and highlight message
      const event = new CustomEvent('navigate-to-message', {
        detail: { chatId: log.chatId, messageId: log.messageId }
      });
      window.dispatchEvent(event);
      
      // Close activity panel
      const closeEvent = new CustomEvent('close-activity-panel');
      window.dispatchEvent(closeEvent);
    }
  };

  return (
    <>
      <div 
        className={`p-3 rounded-xl glass-subtle animate-in fade-in duration-200 ${
          isClickable ? 'cursor-pointer hover:bg-black/5 transition-colors' : ''
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <ActivityIcon action={log.action} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold font-jakarta text-text-primary">
                {log.action}
              </p>
              <ActivityStatus status={log.status} />
            </div>
            <p className="text-[10px] font-medium text-text-secondary font-jakarta truncate">
              {log.query}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-semibold text-text-secondary font-jakarta">
                {log.result}
              </span>
              <span className="text-[9px] text-text-secondary opacity-50">•</span>
              <span className="text-[9px] font-medium text-text-secondary font-jakarta">
                {formatRelativeTime(log.timestamp)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleGoToMessage}
              className="px-3 py-1.5 rounded-lg glass-subtle hover:glass transition-all active:scale-95 text-[10px] font-bold text-text-primary"
              title="Go to message"
              aria-label="Go to message"
            >
              Go
            </button>
            {isClickable && (
              <ChevronRight size={16} className="text-text-secondary opacity-50" />
            )}
          </div>
        </div>
      </div>

      {/* Search Detail Modal */}
      {showDetail && (
        <SearchDetailModal 
          log={log} 
          onClose={() => setShowDetail(false)} 
        />
      )}
    </>
  );
};

export default ActivityLogItem;
