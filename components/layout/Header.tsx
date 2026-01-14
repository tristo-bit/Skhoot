// Header component - extracted from App.tsx for better separation of concerns
import React, { memo } from 'react';
import { Menu, X, Settings, User as UserIcon, FolderOpen, History, Minus } from 'lucide-react';
import { IconButton } from '../buttonFormat';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePreloadOnHover } from '../performance';

const SkhootLogo = memo(({ size = 24 }: { size?: number }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} />
));
SkhootLogo.displayName = 'SkhootLogo';

export interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenHistory: () => void;
  onOpenFiles: () => void;
  onOpenUser: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onDragMouseDown: (e: React.MouseEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenHistory,
  onOpenFiles,
  onOpenUser,
  onOpenSettings,
  onClose,
  onMinimize,
  onDragMouseDown,
}) => {
  const { showBranding } = useTheme();

  return (
    <header
      className="header-bar relative z-30 flex items-center justify-between cursor-move select-none"
      onMouseDown={onDragMouseDown}
    >
      {/* Left side with morphing background */}
      <div className="flex items-center gap-4 relative">
        {/* Morphing background that extends from sidebar */}
        <div 
          className={`absolute -left-6 -top-5 -bottom-5 rounded-r-3xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] bg-bg-secondary ${
            isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="absolute inset-0 bg-black/5 rounded-r-3xl" />
        </div>
        
        <button 
          onClick={onToggleSidebar}
          data-no-drag
          data-sidebar-toggle
          className="header-sidebar-btn relative z-10 p-1.5 hover:bg-black/5 rounded-lg transition-all text-text-secondary active:scale-95"
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          title={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <div className="relative w-[18px] h-[18px]">
            <Menu 
              size={18} 
              className={`absolute inset-0 transition-all duration-300 ${
                isSidebarOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
              }`}
            />
            <X 
              size={18} 
              className={`absolute inset-0 transition-all duration-300 ${
                isSidebarOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
              }`}
            />
          </div>
        </button>
        
        <div 
          className={`header-logo flex items-center gap-2 relative z-10 transition-all duration-500 ${
            isSidebarOpen || !showBranding ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <span className="header-logo-icon">
            <SkhootLogo size={18} />
          </span>
          <span className="header-logo-text text-sm font-black tracking-[0.2em] font-jakarta text-fuku-brand">
            SKHOOT
          </span>
        </div>
      </div>
      
      <HeaderActions
        onOpenHistory={onOpenHistory}
        onOpenFiles={onOpenFiles}
        onOpenUser={onOpenUser}
        onOpenSettings={onOpenSettings}
        onMinimize={onMinimize}
        onClose={onClose}
      />
    </header>
  );
};

interface HeaderActionsProps {
  onOpenHistory: () => void;
  onOpenFiles: () => void;
  onOpenUser: () => void;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  onOpenHistory,
  onOpenFiles,
  onOpenUser,
  onOpenSettings,
  onMinimize,
  onClose,
}) => {
  // Preload hooks for header buttons
  const historyPreload = usePreloadOnHover({ panelKey: 'activity' });
  const filesPreload = usePreloadOnHover({ panelKey: 'file-explorer' });
  const userPreload = usePreloadOnHover({ panelKey: 'user-panel' });
  const settingsPreload = usePreloadOnHover({ panelKey: 'settings' });

  return (
    <div className="header-actions flex items-center gap-2 relative z-10" data-no-drag>
      <IconButton 
        icon={<History size={18} />}
        onClick={onOpenHistory} 
        onMouseEnter={historyPreload.onMouseEnter}
        onMouseLeave={historyPreload.onMouseLeave}
        aria-label="Activity History"
        variant="glass"
        size="md"
        className="hover:bg-purple-500/10 hover:text-purple-500"
        title="Activity History"
      />
      <IconButton 
        icon={<FolderOpen size={18} />}
        onClick={onOpenFiles} 
        onMouseEnter={filesPreload.onMouseEnter}
        onMouseLeave={filesPreload.onMouseLeave}
        aria-label="Utility"
        variant="glass"
        size="md"
        className="hover:bg-amber-500/10 hover:text-amber-500"
        title="Files & Utilities"
      />
      <IconButton 
        icon={<UserIcon size={18} />}
        onClick={onOpenUser} 
        onMouseEnter={userPreload.onMouseEnter}
        onMouseLeave={userPreload.onMouseLeave}
        aria-label="User profile"
        variant="glass"
        size="md"
        className="hover:bg-cyan-500/10 hover:text-cyan-500"
        title="User Profile"
      />
      <IconButton 
        icon={<Settings size={18} />}
        onClick={onOpenSettings} 
        onMouseEnter={settingsPreload.onMouseEnter}
        onMouseLeave={settingsPreload.onMouseLeave}
        aria-label="Settings"
        variant="glass"
        size="md"
        className="hover:bg-emerald-500/10 hover:text-emerald-500"
        title="Settings"
      />
      <IconButton 
        icon={<Minus size={18} />}
        onClick={onMinimize} 
        aria-label="Minimize"
        variant="glass"
        size="md"
        className="hover:bg-blue-500/10 hover:text-blue-500"
        title="Minimize to taskbar"
      />
      <IconButton 
        icon={<X size={18} />}
        onClick={onClose} 
        aria-label="Close"
        variant="glass"
        size="md"
        className="hover:bg-red-500/10 hover:text-red-500"
        title="Close"
      />
    </div>
  );
};

export default Header;
