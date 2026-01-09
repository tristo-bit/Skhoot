import React, { memo, useState, useEffect } from 'react';
import { COLORS, THEME, GLASS_STYLES } from '../constants';
import { Search, Plus, Star, X, MessageSquare, Trash2 } from 'lucide-react';
import { Chat } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  chats: Chat[];
  currentChatId: string | null;
}

const SkhootLogo = memo(({ size = 24 }: { size?: number }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} />
));
SkhootLogo.displayName = 'SkhootLogo';

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onClose, onSelectChat, onDeleteChat, chats, currentChatId }) => (
  <div 
    className="w-64 h-full border-r border-black/5 flex flex-col shadow-2xl relative overflow-hidden" 
    style={{ backgroundColor: THEME.sidebar }}
  >
    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
    
    {/* Sidebar Header */}
    <div className="relative z-10 px-5 py-5 flex items-center gap-4">
      <button 
        onClick={onClose}
        className="p-1.5 hover:bg-black/5 rounded-lg transition-all text-gray-600 active:scale-95"
        aria-label="Close menu"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-2">
        <SkhootLogo size={18} />
        <span 
          className="text-sm font-black tracking-[0.2em] font-jakarta" 
          style={{ color: COLORS.fukuBrand }}
        >
          SKHOOT
        </span>
      </div>
    </div>
    
    {/* New Search Button */}
    <div className="relative z-10 px-5 mb-6">
      <NewSearchButton onClick={onNewChat} />
    </div>

    {/* Search History */}
    <div className="relative z-10 flex-1 overflow-y-auto space-y-2 no-scrollbar px-5">
      <div className="flex items-center justify-between px-2 mb-3">
        <p 
          className="text-[10px] font-black uppercase tracking-[0.1em] font-jakarta"
          style={{ color: '#1e1e1e' }}
        >
          Past searches
        </p>
        <Star size={10} style={{ color: '#1e1e1e' }} className="opacity-20" />
      </div>
      
      {chats.length === 0 ? (
        <EmptySearchState />
      ) : (
        <div className="space-y-2">
          {chats.map(chat => (
            <ChatItem 
              key={chat.id}
              chat={chat}
              isActive={chat.id === currentChatId}
              onSelect={() => onSelectChat(chat.id)}
              onDelete={() => onDeleteChat(chat.id)}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ChatItem = memo<ChatItemProps>(({ chat, isActive, onSelect, onDelete }) => {
  const [isHovering, setIsHovering] = useState(false);
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
        isActive ? 'bg-white/60' : 'hover:bg-white/40'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: COLORS.iceMelt }}
        >
          <MessageSquare size={14} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-gray-800 truncate font-jakarta">
            {chat.title}
          </p>
          <p className="text-[10px] text-gray-500 font-jakarta">
            {formatDate(chat.updatedAt)}
          </p>
        </div>
      </div>
      
      {/* Delete button */}
      {isHovering && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
        >
          <Trash2 size={12} className="text-red-500" />
        </button>
      )}
    </div>
  );
});
ChatItem.displayName = 'ChatItem';

const EmptySearchState = memo(() => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 opacity-40">
    <div className="p-3 rounded-full bg-black/5">
      <Search size={24} style={{ color: COLORS.textSecondary }} />
    </div>
    <p 
      className="text-[11px] font-bold font-jakarta" 
      style={{ color: COLORS.textSecondary }}
    >
      No recent searches
    </p>
  </div>
));
EmptySearchState.displayName = 'EmptySearchState';

const NewSearchButton = memo<{ onClick: () => void }>(({ onClick }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [shouldSpin, setShouldSpin] = useState(false);
  const [spinStartTime, setSpinStartTime] = useState<number | null>(null);
  const [isSnappingBack, setIsSnappingBack] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isHovering) {
      timeout = setTimeout(() => {
        setShouldSpin(true);
        setSpinStartTime(Date.now());
      }, 1000);
    } else {
      if (shouldSpin && spinStartTime) {
        const spinDuration = Date.now() - spinStartTime;
        const snapBackDuration = Math.min(Math.max(spinDuration * 0.3, 200), 800);
        
        setIsSnappingBack(true);
        setShouldSpin(false);
        
        setTimeout(() => {
          setIsSnappingBack(false);
          setSpinStartTime(null);
        }, snapBackDuration);
      } else {
        setShouldSpin(false);
        setSpinStartTime(null);
      }
    }

    return () => clearTimeout(timeout);
  }, [isHovering, shouldSpin, spinStartTime]);

  const handleClick = () => {
    if (shouldSpin && spinStartTime) {
      const spinDuration = Date.now() - spinStartTime;
      const snapBackDuration = Math.min(Math.max(spinDuration * 0.3, 200), 800);
      
      setIsSnappingBack(true);
      setShouldSpin(false);
      
      setTimeout(() => {
        setIsSnappingBack(false);
        setSpinStartTime(null);
      }, snapBackDuration);
    }
    onClick();
  };

  const getSnapBackStyle = () => {
    if (!isSnappingBack || !spinStartTime) return {};
    
    const spinDuration = Date.now() - spinStartTime;
    const snapBackDuration = Math.min(Math.max(spinDuration * 0.3, 200), 800);
    
    return {
      transitionDuration: `${snapBackDuration}ms`,
      transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    };
  };

  return (
    <button 
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all active:scale-95 border border-black/5 hover:brightness-105 group"
      style={{ 
        backgroundColor: `${COLORS.iceMelt}B0`,
        ...GLASS_STYLES.base,
        boxShadow: GLASS_STYLES.elevated.boxShadow,
        color: COLORS.textPrimary,
      }}
    >
      <div 
        className="w-8 h-8 rounded-xl flex items-center justify-center border border-black/5 overflow-hidden"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
        }}
      >
        <Plus 
          size={18} 
          className={`${
            shouldSpin 
              ? 'animate-spin' 
              : isSnappingBack 
                ? 'transform rotate-0' 
                : 'transition-transform duration-300 ease-out group-hover:rotate-90'
          }`}
          style={isSnappingBack ? getSnapBackStyle() : {}}
        />
      </div>
      <span className="text-sm font-black tracking-tight font-jakarta">New Search</span>
    </button>
  );
});
NewSearchButton.displayName = 'NewSearchButton';

export default Sidebar;
