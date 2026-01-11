// Hook for activity logs - separates state management from UI
import { useState, useEffect, useCallback } from 'react';
import { 
  activityLogger, 
  ActivityLog, 
  ActivityFilter 
} from '../../../services/activityLogger';

export interface UseActivityLogsReturn {
  logs: ActivityLog[];
  filter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  clearLogs: () => void;
  exportJSON: () => void;
  exportCSV: () => void;
  isEmpty: boolean;
}

export const useActivityLogs = (): UseActivityLogsReturn => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [logs, setLogs] = useState<ActivityLog[]>(() => 
    activityLogger.getFilteredLogs('all')
  );

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = activityLogger.subscribe((newLogs) => {
      setLogs(activityLogger.getFilteredLogs(filter));
    });
    return unsubscribe;
  }, [filter]);

  // Update logs when filter changes
  useEffect(() => {
    setLogs(activityLogger.getFilteredLogs(filter));
  }, [filter]);

  const clearLogs = useCallback(() => {
    activityLogger.clearLogs();
  }, []);

  const exportJSON = useCallback(() => {
    const data = activityLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skhoot-activity-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportCSV = useCallback(() => {
    const data = activityLogger.exportLogsCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skhoot-activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    logs,
    filter,
    setFilter,
    clearLogs,
    exportJSON,
    exportCSV,
    isEmpty: logs.length === 0
  };
};
