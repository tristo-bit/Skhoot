import React, { memo } from 'react';
import { Search } from 'lucide-react';
import { COLORS, THEME } from '../constants';
import { Message, FileInfo } from '../types';

export const MessageBubble = memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div 
        className={`max-w-[90%] p-4 rounded-3xl shadow-sm border border-black/5 ${
          isUser ? 'rounded-tr-none' : 'rounded-tl-none'
        }`}
        style={{ backgroundColor: isUser ? THEME.userBubble : THEME.assistantBubble }}
      >
        <p 
          className="text-[13px] leading-relaxed font-semibold font-jakarta" 
          style={{ color: isUser ? COLORS.textPrimary : '#333333' }}
        >
          {message.content}
        </p>

        {message.type === 'file_list' && message.data && (
          <FileList files={message.data} />
        )}

        {message.type === 'disk_usage' && message.data && (
          <DiskUsage items={message.data} />
        )}
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const FileList = memo<{ files: FileInfo[] }>(({ files }) => (
  <div className="mt-4 space-y-2">
    {files.map(file => (
      <div 
        key={file.id} 
        className="p-3 bg-white/60 rounded-2xl border border-white/40 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center" 
            style={{ backgroundColor: COLORS.almostAqua }}
          >
            <Search size={14} className="text-gray-700" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold truncate text-gray-800 font-jakarta">{file.name}</p>
            <p className="text-[9px] font-medium opacity-50 truncate font-jakarta">{file.path}</p>
          </div>
        </div>
        <span className="text-[9px] font-black whitespace-nowrap ml-2 opacity-60 font-jakarta">
          {file.size}
        </span>
      </div>
    ))}
  </div>
));
FileList.displayName = 'FileList';

const DiskUsage = memo<{ items: FileInfo[] }>(({ items }) => (
  <div className="mt-4 p-4 bg-white/40 rounded-2xl border border-white/50">
    <h4 className="text-[10px] font-bold mb-3 uppercase tracking-tighter opacity-40 font-jakarta">
      Disk Analysis
    </h4>
    <div className="space-y-3">
      {items.slice(0, 3).map(item => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold font-jakarta">
            <span className="truncate max-w-[180px] text-gray-700">{item.name}</span>
            <span>{item.size}</span>
          </div>
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000" 
              style={{ 
                backgroundColor: COLORS.orchidTint, 
                width: item.size.includes('GB') ? '82%' : '18%' 
              }} 
            />
          </div>
        </div>
      ))}
    </div>
  </div>
));
DiskUsage.displayName = 'DiskUsage';

export const LoadingIndicator = memo(() => (
  <div className="flex justify-start">
    <div 
      className="px-5 py-3 rounded-2xl border border-black/5 animate-pulse flex gap-2 items-center" 
      style={{ backgroundColor: THEME.assistantBubble }}
    >
      {[0, 0.2, 0.4].map((delay, i) => (
        <div 
          key={i}
          className="w-2 h-2 rounded-full animate-bounce bg-black/20"
          style={{ animationDelay: `${delay}s`, opacity: 0.2 + (i * 0.1) }}
        />
      ))}
    </div>
  </div>
));
LoadingIndicator.displayName = 'LoadingIndicator';
