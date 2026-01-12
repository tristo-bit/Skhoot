import React, { memo, useState, useEffect } from 'react';
import { Search, Plus, X, MessageSquare, LogIn, LogOut } from 'lucide-react';
import { Chat, User } from '../../types';
import { CloseButton, Button, IconButton } from '../buttonFormat';
import { useTheme } from '../../src/contexts/ThemeContext';

interface SidebarProps {
  onNewChat: () => void;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  chats: Chat[];
  currentChatId: string | null;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const SkhootLogo = memo(({ size = 24 }: { size?: number }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} className="dark:brightness-90" />
));
SkhootLogo.displayName = 'SkhootLogo';

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onClose, onSelectChat, onDeleteChat, chats, currentChatId, user, onSignIn, onSignOut }) => {
  const { showBranding } = useTheme();
  
  return (
    <div 
      className="w-64 h-full border-r border-black/5 flex flex-col relative glass z-50" 
    >
      
      {/* Sidebar Header */}
      <div className="relative z-10 px-5 py-5 flex items-center gap-4 flex-shrink-0">
        <CloseButton 
          onClick={onClose}
          className="p-1.5 hover:bg-black/5 rounded-lg"
        />
        {showBranding && (
          <div className="flex items-center gap-2">
            <SkhootLogo size={18} />
            <span 
              className="text-sm font-black tracking-[0.2em] font-jakarta text-fuku-brand" 
            >
              SKHOOT
            </span>
          </div>
        )}
      </div>
    
    {/* New Search Button */}
    <div className="relative z-10 px-5 mb-4 flex-shrink-0">
      <NewSearchButton onClick={onNewChat} />
    </div>

    {/* Past Searches Header - Fixed */}
    <div className="relative z-10 px-5 flex-shrink-0">
      <div className="px-2 mb-3">
        <p 
          className="text-[10px] font-black uppercase tracking-[0.1em] font-jakarta text-text-primary"
        >
          Past searches
        </p>
      </div>
    </div>

    {/* Scrollable Conversations List */}
    <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-5 min-h-0">
      {chats.length === 0 ? (
        <EmptySearchState />
      ) : (
        <div className="space-y-2 pb-2">
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

    {/* Auth Button at Bottom */}
    <div className="relative z-10 px-5 py-4 border-t border-black/5 flex-shrink-0">
      <AuthButton user={user} onSignIn={onSignIn} onSignOut={onSignOut} />
    </div>
  </div>
  );
};

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ChatItem = memo<ChatItemProps>(({ chat, isActive, onSelect, onDelete }) => {
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
        isActive ? 'glass-elevated' : 'hover:bg-white/10 dark:hover:bg-white/5'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-ice-melt"
        >
          <MessageSquare size={14} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-text-primary truncate font-jakarta">
            {chat.title}
          </p>
          <p className="text-[10px] text-text-secondary font-jakarta">
            {formatDate(chat.updatedAt)}
          </p>
        </div>
        {/* Delete button - always visible */}
        <IconButton
          icon={<X size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          variant="ghost"
          size="sm"
          className="text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all flex-shrink-0"
          ariaLabel="Remove conversation"
        />
      </div>
    </div>
  );
});
ChatItem.displayName = 'ChatItem';

const EmptySearchState = memo(() => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 opacity-40">
    <div className="p-3 rounded-full bg-black/5">
      <Search size={24} className="text-text-secondary" />
    </div>
    <p 
      className="text-[11px] font-bold font-jakarta text-text-secondary" 
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
    <Button
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      variant="glass"
      size="lg"
      data-new-chat
      icon={
        <Plus 
          size={18} 
          className={`text-text-primary ${
            shouldSpin 
              ? 'animate-spin' 
              : isSnappingBack 
                ? 'transform rotate-0' 
                : 'transition-transform duration-300 ease-out group-hover:rotate-90'
          }`}
          style={isSnappingBack ? getSnapBackStyle() : {}}
        />
      }
      iconPosition="left"
      className="flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all active:scale-95 glass-elevated hover:brightness-105 group text-text-primary"
    >
      <span className="text-sm font-black tracking-tight font-jakarta">New Search</span>
    </Button>
  );
});
NewSearchButton.displayName = 'NewSearchButton';

const AuthButton = memo<{ user: User | null; onSignIn: () => void; onSignOut: () => void }>(
  ({ user, onSignIn, onSignOut }) => {
    if (user) {
      return (
        <Button
          onClick={onSignOut}
          variant="ghost"
          size="lg"
          icon={
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-jakarta bg-accent">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          }
          iconPosition="left"
          className="flex items-center gap-3 w-full p-3 rounded-xl transition-all hover:bg-white/10 dark:hover:bg-white/5 active:scale-[0.98] group justify-start"
        >
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-bold text-text-primary truncate font-jakarta">
              {user.displayName}
            </p>
            <p className="text-[10px] text-text-secondary truncate font-jakarta">
              {user.email}
            </p>
          </div>
          <LogOut size={14} className="text-text-secondary group-hover:text-red-500 transition-colors" />
        </Button>
      );
    }

    return (
      <Button
        onClick={onSignIn}
        variant="glass"
        size="lg"
        icon={<LogIn size={16} className="text-text-primary" />}
        iconPosition="left"
        className="flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all active:scale-95 glass-elevated hover:brightness-105 text-text-primary"
      >
        <span className="text-sm font-black tracking-tight font-jakarta">Sign In</span>
      </Button>
    );
  }
);
AuthButton.displayName = 'AuthButton';

export default Sidebar;
