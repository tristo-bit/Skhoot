import React, { memo, useState } from 'react';
import { X, Search, FileText, MessageSquare, Archive, Trash2, HardDrive, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { COLORS } from '../constants';
import { MOCK_ACTION_LOGS } from '../browser-test/demo';

interface TraceabilityPanelProps {
  onClose: () => void;
}

type FilterType = 'all' | 'search' | 'cleanup' | 'archive';

const TraceabilityPanel: React.FC<TraceabilityPanelProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [logs] = useState(MOCK_ACTION_LOGS);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'search') return log.action.includes('Search');
    if (filter === 'cleanup') return log.action === 'Cleanup';
    if (filter === 'archive') return log.action === 'Archive';
    return true;
  });

  const getActionIcon = (action: string) => {
    if (action.includes('File')) return <FileText size={14} />;
    if (action.includes('Message')) return <MessageSquare size={14} />;
    if (action === 'Archive') return <Archive size={14} />;
    if (action === 'Cleanup') return <Trash2 size={14} />;
    if (action === 'Disk') return <HardDrive size={14} />;
    return <Search size={14} />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('File')) return COLORS.almostAqua;
    if (action.includes('Message')) return COLORS.raindropsOnRoses;
    if (action === 'Archive') return COLORS.orchidTint;
    if (action === 'Cleanup') return COLORS.lemonIcing;
    if (action === 'Disk') return COLORS.iceMelt;
    return COLORS.nimbusCloud;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[420px] max-h-[85%] rounded-3xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black font-jakarta" style={{ color: COLORS.textPrimary }}>
              Activity Log
            </h2>
            <p className="text-[10px] font-medium text-gray-400 font-jakarta mt-0.5">
              Track all Skhoot actions and outputs
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-xl transition-all active:scale-95"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 flex gap-2 border-b border-black/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as FilterType, label: 'All' },
            { id: 'search' as FilterType, label: 'Searches' },
            { id: 'cleanup' as FilterType, label: 'Cleanup' },
            { id: 'archive' as FilterType, label: 'Archive' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-jakarta whitespace-nowrap transition-all ${
                filter === f.id 
                  ? 'bg-black/10 text-gray-800' 
                  : 'bg-black/[0.03] text-gray-500 hover:bg-black/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="p-4 overflow-y-auto max-h-[400px] no-scrollbar space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-[12px] font-semibold text-gray-400 font-jakarta">No activity yet</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div 
                key={log.id}
                className="p-3 rounded-xl border border-black/5 animate-in fade-in duration-200"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${getActionColor(log.action)}50` }}
                  >
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-bold font-jakarta text-gray-800">
                        {log.action}
                      </p>
                      {log.status === 'success' ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-gray-500 font-jakarta truncate">
                      {log.query}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-semibold text-gray-400 font-jakarta">
                        {log.result}
                      </span>
                      <span className="text-[9px] text-gray-300">•</span>
                      <span className="text-[9px] font-medium text-gray-400 font-jakarta">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-black/5">
          <button 
            className="w-full py-2.5 rounded-xl text-[11px] font-bold font-jakarta text-gray-500 hover:bg-black/5 transition-all"
          >
            Export Activity Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraceabilityPanel;
