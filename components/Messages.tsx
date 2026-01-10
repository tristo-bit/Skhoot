import React, { memo, useState } from 'react';
import { Search, FileText, MessageSquare, ExternalLink, Copy, Check, Folder, Trash2, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import { Message, FileInfo, ConversationMessage, CleanupItem, DiskInfo } from '../types';
import { MarkdownRenderer } from './shared';
import { Button, IconButton } from './buttonFormat';
import { COLORS } from '../src/constants';

export const MessageBubble = memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user';
  
  if (!isUser) {
    // AI message - no bubble, markdown rendered with theme colors
    return (
      <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[95%] py-2 px-1">
          <MarkdownRenderer content={message.content} />

          {message.type === 'file_list' && message.data && (
            <FileList 
              files={message.data} 
              searchInfo={(message as any).searchInfo}
            />
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

  // User message - embossed bubble
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div 
        className="max-w-[90%] p-4 rounded-3xl rounded-tr-none border-glass-border glass-subtle"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p className="text-[13px] leading-relaxed font-semibold font-jakarta text-text-primary">
          {message.content}
        </p>
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// File item with Go/Copy buttons and enhanced search info
const FileItem = memo<{ file: FileInfo; searchInfo?: any }>(({ file, searchInfo }) => {
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
    <div className="glass-subtle p-3 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate text-text-primary font-jakarta">{file.name}</p>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta text-text-secondary">{file.path}</p>
          
          {/* Enhanced search info */}
          {(file as any).score && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full glass-subtle text-accent">
                Score: {(file as any).score}
              </span>
              {(file as any).source && (
                <span className="text-[9px] font-medium text-text-secondary">
                  via {(file as any).source}
                </span>
              )}
            </div>
          )}
          
          {/* Show snippet if available */}
          {(file as any).snippet && (
            <p className="text-[10px] font-medium text-text-secondary mt-1 italic">
              "{(file as any).snippet.substring(0, 60)}..."
            </p>
          )}
        </div>
        <span className="text-[10px] font-black whitespace-nowrap opacity-50 font-jakarta text-text-secondary">
          {file.size}
        </span>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
        <Button
          onClick={handleGo}
          variant="glass"
          size="xs"
          icon={<Folder size={12} />}
          iconPosition="left"
          className="flex-1 text-text-primary"
        >
          Go
        </Button>
        <Button
          onClick={handleCopy}
          variant={copied ? 'primary' : 'glass'}
          size="xs"
          icon={copied ? <Check size={12} /> : <Copy size={12} />}
          iconPosition="left"
          className="flex-1"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
});
FileItem.displayName = 'FileItem';

const FileList = memo<{ files: FileInfo[]; searchInfo?: any }>(({ files, searchInfo }) => (
  <div className="mt-4 space-y-2">
    {/* Search info header */}
    {searchInfo && (
      <div className="p-3 rounded-xl glass-subtle border-glass-border mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-accent" />
            <span className="text-[11px] font-bold text-text-primary font-jakarta">
              Search Results
            </span>
          </div>
          <span className="text-[10px] font-medium text-text-secondary">
            {searchInfo.executionTime}ms
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-[10px] font-medium text-text-secondary">
          <span>Query: "{searchInfo.query}"</span>
          <span>Mode: {searchInfo.mode}</span>
          <span>Found: {searchInfo.totalResults}</span>
        </div>
        
        {/* AI Suggestions */}
        {searchInfo.suggestions && searchInfo.suggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-glass-border">
            <p className="text-[9px] font-bold text-text-secondary mb-1">💡 Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {searchInfo.suggestions.slice(0, 3).map((suggestion: any, i: number) => (
                <span 
                  key={i}
                  className="text-[9px] px-2 py-1 rounded-full glass-subtle text-accent cursor-pointer hover:glass-elevated transition-all"
                  title={suggestion.reason}
                >
                  {suggestion.suggestion}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Error message if fallback */}
        {searchInfo.error && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-[9px] font-medium text-amber-700">
              ⚠️ {searchInfo.error}
            </p>
          </div>
        )}
      </div>
    )}
    
    {files.length === 0 ? (
      <div className="p-4 text-center opacity-50">
        <p className="text-[11px] font-semibold font-jakarta">No files found</p>
        {searchInfo && (
          <p className="text-[10px] font-medium text-text-secondary mt-1">
            Try a different search term or check if the backend is running
          </p>
        )}
      </div>
    ) : (
      files.map((file, index) => (
        <div 
          key={file.id} 
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <FileItem file={file} searchInfo={searchInfo} />
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
    <div className="glass-subtle p-3 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black text-text-primary font-jakarta">{message.user}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full glass-subtle text-accent">
              {message.app}
            </span>
          </div>
          <p className="text-[12px] font-medium text-text-secondary font-jakarta leading-relaxed">{message.text}</p>
          <p className="text-[9px] font-medium opacity-40 mt-1 font-jakarta text-text-secondary">{message.timestamp}</p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
        <Button
          onClick={handleGo}
          variant="glass"
          size="xs"
          icon={<ExternalLink size={12} />}
          iconPosition="left"
          className="flex-1 text-accent"
        >
          Go
        </Button>
        <Button
          onClick={handleCopy}
          variant={copied ? 'primary' : 'glass'}
          size="xs"
          icon={copied ? <Check size={12} /> : <Copy size={12} />}
          iconPosition="left"
          className="flex-1"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
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

const DiskUsage = memo<{ items: DiskInfo[] }>(({ items }) => (
  <div className="mt-4 p-4 glass-subtle rounded-2xl border-glass-border">
    <h4 className="text-[10px] font-bold mb-3 uppercase tracking-tighter opacity-40 font-jakarta text-text-secondary">
      Disk Analysis
    </h4>
    <div className="space-y-4">
      {items.map(disk => (
        <div key={disk.id} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-black text-text-primary font-jakarta">{disk.name}</span>
            <span className="text-[11px] font-bold text-text-secondary font-jakarta">
              {disk.usagePercentage}% used
            </span>
          </div>
          <div className="text-[11px] text-text-primary font-jakarta font-medium">
            {disk.availableSpace} GB available of {disk.totalSpace} GB
          </div>
          <div className="text-[11px] text-text-secondary font-jakarta font-medium mb-2">
            {disk.usedSpace} GB used ({disk.usagePercentage}%)
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--glass-border)' }}>
            <div 
              className="h-full transition-all duration-1000 rounded-full" 
              style={{ 
                width: `${disk.usagePercentage}%`,
                backgroundColor: 'var(--accent)'
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
      <div className="p-3 rounded-2xl border border-green-500/30 animate-in fade-in duration-300 bg-green-500/10">
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
      <div className="p-3 rounded-2xl border border-accent/30 animate-in fade-in duration-300 bg-accent/10">
        <div className="flex items-center gap-2 text-accent">
          <Archive size={16} />
          <span className="text-[11px] font-bold font-jakarta">
            {item.name} archived — searchable via Skhoot
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-subtle p-4 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <Folder size={18} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold truncate text-text-primary font-jakarta">{item.name}</p>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full glass-subtle text-text-secondary">
              {item.size}
            </span>
          </div>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta text-text-secondary">{item.path}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mt-3 p-2.5 rounded-xl glass-subtle">
        <p className="text-[10px] font-medium text-text-secondary font-jakarta leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Consequence warning */}
      <div className={`mt-2 p-2.5 rounded-xl flex items-start gap-2 ${
        item.canRemove ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        {item.canRemove ? (
          <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <p className={`text-[10px] font-semibold font-jakarta leading-relaxed ${
          item.canRemove ? 'text-green-700' : 'text-amber-700'
        }`}>
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
          <Button
            onClick={handleRemove}
            disabled={isRemoving || isArchiving}
            variant="danger"
            size="xs"
            icon={<Trash2 size={12} className={isRemoving ? 'animate-spin' : ''} />}
            iconPosition="left"
            className="flex-1"
            loading={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
          <Button
            onClick={handleArchive}
            disabled={isRemoving || isArchiving}
            variant={isArchiving ? 'primary' : 'glass'}
            size="xs"
            icon={<Archive size={12} className={isArchiving ? 'animate-pulse' : ''} />}
            iconPosition="left"
            className="flex-1"
            loading={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </Button>
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
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-subtle border-glass-border">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center glass-subtle">
            <span className="text-accent animate-pulse">{icons[type]}</span>
          </div>
          {/* Scanning animation */}
          <div 
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ 
              background: `linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)`,
              opacity: 0.3,
              animation: 'scan 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div>
          <p className="text-[12px] font-bold font-jakarta text-text-primary">
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
