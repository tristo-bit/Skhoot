// Single activity log item - reusable UI component
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
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

  const handleClick = () => {
    if (isClickable) {
      setShowDetail(true);
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
        <div className="flex items-start gap-3">
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
          {isClickable && (
            <ChevronRight size={16} className="text-text-secondary opacity-50 flex-shrink-0 mt-2" />
          )}
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
