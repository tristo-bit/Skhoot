// Search Detail Modal - Shows detailed search information
import React from 'react';
import { ChevronLeft, Search, Clock, Filter, FolderOpen, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ActivityLog, formatRelativeTime } from '../../../services/activityLogger';
import { ActivityIcon, getActivityColor } from './ActivityIcon';
import { ActivityStatus } from './ActivityStatus';
import { CloseButton } from '../../buttonFormat';

interface SearchDetailModalProps {
  log: ActivityLog;
  onClose: () => void;
}

export const SearchDetailModal: React.FC<SearchDetailModalProps> = ({ log, onClose }) => {
  const bgColor = `${getActivityColor(log.action)}50`;
  const searchMeta = log.searchMetadata;

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[480px] max-h-[85%] rounded-3xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300 glass-elevated flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Same style as Activity Log */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl glass-subtle flex items-center justify-center hover:bg-black/5 transition-colors"
            >
              <ChevronLeft size={18} className="text-text-secondary" />
            </button>
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bgColor }}
              >
                <ActivityIcon action={log.action} />
              </div>
              <div>
                <h2 className="text-lg font-black font-jakarta text-text-primary">
                  {log.action}
                </h2>
                <p className="text-[10px] font-medium text-text-secondary font-jakarta mt-0.5">
                  {formatRelativeTime(log.timestamp)}
                </p>
              </div>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 no-scrollbar space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <ActivityStatus status={log.status} />
            <span className="text-[11px] font-medium text-text-secondary">
              {log.result}
            </span>
          </div>

          {/* Search Query */}
          <div className="p-3 rounded-xl glass-subtle">
            <div className="flex items-center gap-2 mb-2">
              <Search size={14} className="text-text-secondary" />
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                Search Query
              </span>
            </div>
            <p className="text-[12px] font-semibold text-text-primary font-mono bg-black/5 px-3 py-2 rounded-lg">
              {searchMeta?.query || log.query}
            </p>
          </div>

          {/* Search Parameters */}
          {searchMeta && (
            <div className="p-3 rounded-xl glass-subtle">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  Search Parameters
                </span>
              </div>
              <div className="space-y-2">
                {searchMeta.fileTypes && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">File Types</span>
                    <span className="text-[11px] font-semibold text-text-primary font-mono">
                      {searchMeta.fileTypes}
                    </span>
                  </div>
                )}
                {searchMeta.searchPath && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">Search Path</span>
                    <span className="text-[11px] font-semibold text-text-primary font-mono">
                      {searchMeta.searchPath}
                    </span>
                  </div>
                )}
                {searchMeta.searchMode && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">Search Mode</span>
                    <span className="text-[11px] font-semibold text-text-primary">
                      {searchMeta.searchMode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance */}
          {searchMeta?.executionTime !== undefined && (
            <div className="p-3 rounded-xl glass-subtle">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  Performance
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-secondary">Execution Time</span>
                  <span className="text-[11px] font-semibold text-text-primary">
                    {searchMeta.executionTime}ms
                  </span>
                </div>
                {searchMeta.originalResults !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">Total Results</span>
                    <span className="text-[11px] font-semibold text-text-primary">
                      {searchMeta.originalResults}
                    </span>
                  </div>
                )}
                {searchMeta.filteredResults !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">After Filtering</span>
                    <span className="text-[11px] font-semibold text-text-primary">
                      {searchMeta.filteredResults}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter Reason */}
          {searchMeta?.filterReason && (
            <div className="p-3 rounded-xl glass-subtle">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  AI Filter Reason
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {searchMeta.filterReason}
              </p>
            </div>
          )}

          {/* Results Preview */}
          {searchMeta?.results && searchMeta.results.length > 0 && (
            <div className="p-3 rounded-xl glass-subtle">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={14} className="text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  Results ({searchMeta.results.length})
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                {searchMeta.results.slice(0, 20).map((result, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      result.included ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {result.included ? (
                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle size={12} className="text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-text-primary truncate">
                        {result.name}
                      </p>
                      <p className="text-[9px] text-text-secondary truncate">
                        {result.path}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-text-secondary flex-shrink-0">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                {searchMeta.results.length > 20 && (
                  <p className="text-[10px] text-text-secondary text-center py-2">
                    +{searchMeta.results.length - 20} more results
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDetailModal;
