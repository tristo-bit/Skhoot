import React, { memo, useState } from 'react';
import { Search, FileText, MessageSquare, ExternalLink, Copy, Check, Folder, Trash2, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import { COLORS, THEME, GLASS_STYLES } from '../constants';
import { Message, FileInfo, ConversationMessage, CleanupItem } from '../types';
import { MarkdownRenderer } from './shared';

export const MessageBubble = memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user';
  
  // User bubble style - keep the frosted glass look
  const userBubbleStyle = {
    backgroundColor: `${THEME.userBubble}40`,
    backdropFilter: 'blur(8px)',
  };

  // User text style
  const userTextStyle = {
    color: COLORS.textPrimary,
    textShadow: '0 1px 1px rgba(255, 255, 255, 0.6), 0 -0.5px 0.5px rgba(0, 0, 0, 0.08)',
  };
  
  if (!isUser) {
    // AI message - no bubble, markdown rendered with embossed text
    return (
      <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[95%] py-2 px-1">
          <MarkdownRenderer content={message.content} />

          {message.type === 'file_list' && message.data && (
            <FileList files={message.data} />
          )}

          {message.type === 'message_list' && message.data && (
            <MessageList messages={message.data} />
          )}

          {message.type === 'disk_usage' && message.data && (
            <DiskUsage items={message.data} />
          )}

          {message.type === 'cleanup' && message.data && (
            <CleanupList items={message.data} />
          )}
        </div>
      </div>
    );
  }

  // User message - keep bubble
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div 
        className="max-w-[90%] p-4 rounded-3xl rounded-tr-none border border-white/30"
        style={userBubbleStyle}
      >
        <p 
          className="text-[13px] leading-relaxed font-semibold font-jakarta" 
          style={userTextStyle}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// File item with Go/Copy buttons
const FileItem = memo<{ file: FileInfo }>(({ file }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.path + '/' + file.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = () => {
    // In a real app, this would open the file location
    console.log('Opening:', file.path);
  };

  return (
    <div 
      className="p-3 rounded-2xl border border-white/40 animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${COLORS.almostAqua}80` }}
        >
          <FileText size={18} className="text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate text-gray-800 font-jakarta">{file.name}</p>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta">{file.path}</p>
        </div>
        <span className="text-[10px] font-black whitespace-nowrap opacity-50 font-jakarta">
          {file.size}
        </span>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-black/5">
        <button
          onClick={handleGo}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 hover:brightness-95"
          style={{ 
            backgroundColor: `${COLORS.almostAqua}60`,
            color: '#555',
          }}
        >
          <Folder size={12} />
          Go
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 hover:brightness-95"
          style={{ 
            backgroundColor: copied ? `${COLORS.almostAqua}` : 'rgba(0, 0, 0, 0.05)',
            color: copied ? '#fff' : '#555',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
});
FileItem.displayName = 'FileItem';

const FileList = memo<{ files: FileInfo[] }>(({ files }) => (
  <div className="mt-4 space-y-2">
    {files.length === 0 ? (
      <div className="p-4 text-center opacity-50">
        <p className="text-[11px] font-semibold font-jakarta">No files found</p>
      </div>
    ) : (
      files.map((file, index) => (
        <div 
          key={file.id} 
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <FileItem file={file} />
        </div>
      ))
    )}
  </div>
));
FileList.displayName = 'FileList';

// Message item with Go/Copy buttons
const MessageItem = memo<{ message: ConversationMessage }>(({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = () => {
    // In a real app, this would open the app/conversation
    console.log('Opening conversation in:', message.app);
  };

  // App colors
  const appColors: Record<string, string> = {
    Slack: '#4A154B',
    Discord: '#5865F2',
    iMessage: '#34C759',
  };

  return (
    <div 
      className="p-3 rounded-2xl border border-white/40 animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${appColors[message.app] || COLORS.raindropsOnRoses}20` }}
        >
          <MessageSquare size={18} style={{ color: appColors[message.app] || '#666' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black text-gray-800 font-jakarta">{message.user}</span>
            <span 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${appColors[message.app] || '#666'}15`,
                color: appColors[message.app] || '#666',
              }}
            >
              {message.app}
            </span>
          </div>
          <p className="text-[12px] font-medium text-gray-600 font-jakarta leading-relaxed">{message.text}</p>
          <p className="text-[9px] font-medium opacity-40 mt-1 font-jakarta">{message.timestamp}</p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-black/5">
        <button
          onClick={handleGo}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 hover:brightness-95"
          style={{ 
            backgroundColor: `${appColors[message.app] || COLORS.raindropsOnRoses}20`,
            color: appColors[message.app] || '#555',
          }}
        >
          <ExternalLink size={12} />
          Go
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 hover:brightness-95"
          style={{ 
            backgroundColor: copied ? COLORS.almostAqua : 'rgba(0, 0, 0, 0.05)',
            color: copied ? '#fff' : '#555',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

const MessageList = memo<{ messages: ConversationMessage[] }>(({ messages }) => (
  <div className="mt-4 space-y-2">
    {messages.length === 0 ? (
      <div className="p-4 text-center opacity-50">
        <p className="text-[11px] font-semibold font-jakarta">No messages found</p>
      </div>
    ) : (
      messages.map((msg, index) => (
        <div 
          key={msg.id} 
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <MessageItem message={msg} />
        </div>
      ))
    )}
  </div>
));
MessageList.displayName = 'MessageList';

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

// Cleanup item component
const CleanupItemCard = memo<{ item: CleanupItem }>(({ item }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [archived, setArchived] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      setIsRemoving(false);
      setRemoved(true);
    }, 1500);
  };

  const handleArchive = () => {
    setIsArchiving(true);
    setTimeout(() => {
      setIsArchiving(false);
      setArchived(true);
    }, 2000);
  };

  if (removed) {
    return (
      <div 
        className="p-3 rounded-2xl border border-green-200 animate-in fade-in duration-300"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
      >
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle size={16} />
          <span className="text-[11px] font-bold font-jakarta">
            {item.name} removed — {item.size} freed
          </span>
        </div>
      </div>
    );
  }

  if (archived) {
    return (
      <div 
        className="p-3 rounded-2xl border border-purple-200 animate-in fade-in duration-300"
        style={{ backgroundColor: `${COLORS.orchidTint}30` }}
      >
        <div className="flex items-center gap-2" style={{ color: COLORS.fukuBrand }}>
          <Archive size={16} />
          <span className="text-[11px] font-bold font-jakarta">
            {item.name} archived — searchable via Skhoot
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-2xl border border-white/40 animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: item.canRemove ? `${COLORS.lemonIcing}80` : `${COLORS.raindropsOnRoses}80` 
          }}
        >
          <Folder size={18} className="text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold truncate text-gray-800 font-jakarta">{item.name}</p>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-black/5 text-gray-500">
              {item.size}
            </span>
          </div>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta">{item.path}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mt-3 p-2.5 rounded-xl bg-black/[0.03]">
        <p className="text-[10px] font-medium text-gray-600 font-jakarta leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Consequence warning */}
      <div 
        className="mt-2 p-2.5 rounded-xl flex items-start gap-2"
        style={{ 
          backgroundColor: item.canRemove ? `${COLORS.almostAqua}30` : `${COLORS.raindropsOnRoses}40` 
        }}
      >
        {item.canRemove ? (
          <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <p className="text-[10px] font-semibold font-jakarta leading-relaxed" style={{ color: item.canRemove ? '#166534' : '#92400e' }}>
          {item.consequence}
        </p>
      </div>

      {/* Last accessed */}
      <p className="text-[9px] font-medium text-gray-400 mt-2 font-jakarta">
        Last accessed: {item.lastAccessed}
      </p>

      {/* Action buttons */}
      {item.canRemove && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
          <button
            onClick={handleRemove}
            disabled={isRemoving || isArchiving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 disabled:opacity-50"
            style={{ 
              backgroundColor: isRemoving ? COLORS.raindropsOnRoses : 'rgba(239, 68, 68, 0.1)',
              color: isRemoving ? '#fff' : '#dc2626',
            }}
          >
            <Trash2 size={12} className={isRemoving ? 'animate-spin' : ''} />
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
          <button
            onClick={handleArchive}
            disabled={isRemoving || isArchiving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold font-jakarta transition-all active:scale-95 disabled:opacity-50"
            style={{ 
              backgroundColor: isArchiving ? COLORS.orchidTint : `${COLORS.orchidTint}30`,
              color: isArchiving ? '#fff' : COLORS.fukuBrand,
            }}
          >
            <Archive size={12} className={isArchiving ? 'animate-pulse' : ''} />
            {isArchiving ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      )}
    </div>
  );
});
CleanupItemCard.displayName = 'CleanupItemCard';

const CleanupList = memo<{ items: CleanupItem[] }>(({ items }) => {
  const totalSize = items.reduce((acc, item) => {
    const num = parseFloat(item.size);
    const unit = item.size.includes('GB') ? 1000 : 1;
    return acc + (num * unit);
  }, 0);

  const removableSize = items
    .filter(i => i.canRemove)
    .reduce((acc, item) => {
      const num = parseFloat(item.size);
      const unit = item.size.includes('GB') ? 1000 : 1;
      return acc + (num * unit);
    }, 0);

  return (
    <div className="mt-4 space-y-3">
      {/* Summary */}
      <div 
        className="p-4 rounded-2xl border border-white/40"
        style={{ backgroundColor: `${COLORS.lemonIcing}40` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-jakarta">
              Potential Space Savings
            </p>
            <p className="text-xl font-black font-jakarta text-gray-800 mt-1">
              {(removableSize / 1000).toFixed(1)} GB
            </p>
          </div>
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${COLORS.almostAqua}60` }}
          >
            <Trash2 size={24} className="text-gray-600" />
          </div>
        </div>
        <p className="text-[10px] font-medium text-gray-500 mt-2 font-jakarta">
          {items.filter(i => i.canRemove).length} of {items.length} items can be safely removed
        </p>
      </div>

      {/* Items */}
      {items.map((item, index) => (
        <div 
          key={item.id} 
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <CleanupItemCard item={item} />
        </div>
      ))}
    </div>
  );
});
CleanupList.displayName = 'CleanupList';

// Search animation indicator
export const SearchingIndicator = memo<{ type: 'files' | 'messages' | 'disk' | 'cleanup' }>(({ type }) => {
  const labels = {
    files: 'Searching files...',
    messages: 'Searching messages...',
    disk: 'Analyzing disk...',
    cleanup: 'Scanning for cleanup...',
  };

  const icons = {
    files: <FileText size={16} />,
    messages: <MessageSquare size={16} />,
    disk: <Search size={16} />,
    cleanup: <Trash2 size={16} />,
  };

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div 
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ 
          backgroundColor: `${COLORS.orchidTint}30`,
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div className="relative">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${COLORS.orchidTint}50` }}
          >
            <span className="text-gray-600 animate-pulse">{icons[type]}</span>
          </div>
          {/* Scanning animation */}
          <div 
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ 
              background: `linear-gradient(90deg, transparent 0%, ${COLORS.orchidTint}40 50%, transparent 100%)`,
              animation: 'scan 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div>
          <p 
            className="text-[12px] font-bold font-jakarta"
            style={{ 
              color: '#555',
              textShadow: '1px 1px 1px rgba(255, 255, 255, 0.9)',
            }}
          >
            {labels[type]}
          </p>
          <div className="flex gap-1 mt-1">
            {[0, 0.2, 0.4].map((delay, i) => (
              <div 
                key={i}
                className="w-1 h-1 rounded-full animate-bounce"
                style={{ 
                  animationDelay: `${delay}s`,
                  backgroundColor: COLORS.fukuBrand,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
});
SearchingIndicator.displayName = 'SearchingIndicator';

export const LoadingIndicator = memo(() => (
  <div className="flex justify-start">
    <div className="px-1 py-2 flex gap-1.5 items-center">
      {[0, 0.15, 0.3].map((delay, i) => (
        <div 
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ 
            animationDelay: `${delay}s`, 
            backgroundColor: '#888',
            boxShadow: '1px 1px 1px rgba(255, 255, 255, 0.9), -0.5px -0.5px 0.5px rgba(0, 0, 0, 0.15)',
          }}
        />
      ))}
    </div>
  </div>
));
LoadingIndicator.displayName = 'LoadingIndicator';
