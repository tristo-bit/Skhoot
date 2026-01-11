// Single activity log item - reusable UI component
import React from 'react';
import { ActivityLog } from '../../../services/activityLogger';
import { formatRelativeTime } from '../../../services/activityLogger';
import { ActivityIcon, getActivityColor } from './ActivityIcon';
import { ActivityStatus } from './ActivityStatus';

interface ActivityLogItemProps {
  log: ActivityLog;
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log }) => {
  const bgColor = `${getActivityColor(log.action)}50`;

  return (
    <div className="p-3 rounded-xl glass-subtle animate-in fade-in duration-200">
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
      </div>
    </div>
  );
};

export default ActivityLogItem;
