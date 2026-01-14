// Activity Logger Service - Handles all activity logging functionality
// Separated from UI concerns for better maintainability

export type ActivityAction = 
  | 'File Search' 
  | 'Content Search'
  | 'Message Search' 
  | 'Archive' 
  | 'Cleanup' 
  | 'Disk Analysis'
  | 'AI Chat'
  | 'Agent'
  | 'Voice Input'
  | 'Settings Change';

export type ActivityStatus = 'success' | 'error' | 'pending';

export interface SearchMetadata {
  query: string;
  fileTypes?: string;
  searchPath?: string;
  searchMode?: string;
  executionTime?: number;
  originalResults?: number;
  filteredResults?: number;
  filterReason?: string;
  results?: Array<{
    path: string;
    name: string;
    score: number;
    included: boolean;
  }>;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  action: ActivityAction;
  query: string;
  result: string;
  status: ActivityStatus;
  metadata?: Record<string, unknown>;
  searchMetadata?: SearchMetadata;
}

export type ActivityFilter = 'all' | 'search' | 'cleanup' | 'archive' | 'chat';

const STORAGE_KEY = 'skhoot_activity_logs';
const MAX_LOGS = 100;

// Generate unique ID
const generateId = (): string => `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Load logs from localStorage
const loadLogs = (): ActivityLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  } catch {
    return [];
  }
};

// Save logs to localStorage
const saveLogs = (logs: ActivityLog[]): void => {
  try {
    // Keep only the most recent logs
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save activity logs:', error);
  }
};

// In-memory cache
let logsCache: ActivityLog[] = loadLogs();

// Event listeners for real-time updates
type LogListener = (logs: ActivityLog[]) => void;
const listeners: Set<LogListener> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener([...logsCache]));
};

export const activityLogger = {
  /**
   * Log a new activity
   */
  log(
    action: ActivityAction,
    query: string,
    result: string,
    status: ActivityStatus = 'success',
    metadata?: Record<string, unknown>,
    searchMetadata?: SearchMetadata
  ): ActivityLog {
    const log: ActivityLog = {
      id: generateId(),
      timestamp: new Date(),
      action,
      query,
      result,
      status,
      metadata,
      searchMetadata
    };

    logsCache = [log, ...logsCache].slice(0, MAX_LOGS);
    saveLogs(logsCache);
    notifyListeners();

    return log;
  },

  /**
   * Get all logs
   */
  getLogs(): ActivityLog[] {
    return [...logsCache];
  },

  /**
   * Get filtered logs
   */
  getFilteredLogs(filter: ActivityFilter): ActivityLog[] {
    if (filter === 'all') return [...logsCache];

    return logsCache.filter(log => {
      switch (filter) {
        case 'search':
          return log.action.includes('Search');
        case 'cleanup':
          return log.action === 'Cleanup';
        case 'archive':
          return log.action === 'Archive';
        case 'chat':
          return log.action === 'AI Chat' || log.action === 'Voice Input';
        default:
          return true;
      }
    });
  },

  /**
   * Clear all logs
   */
  clearLogs(): void {
    logsCache = [];
    saveLogs(logsCache);
    notifyListeners();
  },

  /**
   * Subscribe to log updates
   */
  subscribe(listener: LogListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(logsCache, null, 2);
  },

  /**
   * Export logs as CSV
   */
  exportLogsCSV(): string {
    const headers = ['ID', 'Timestamp', 'Action', 'Query', 'Result', 'Status'];
    const rows = logsCache.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.action,
      `"${log.query.replace(/"/g, '""')}"`,
      `"${log.result.replace(/"/g, '""')}"`,
      log.status
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};

// Helper to format relative time
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};
