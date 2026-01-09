import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsPanel from './components/SettingsPanel';
import Login from './components/Login';
import Register from './components/Register';
import UserPanel from './components/UserPanel';
import FilesPanel from './components/FilesPanel';
import TraceabilityPanel from './components/TraceabilityPanel';
import { Menu, X, Settings, User as UserIcon, FolderOpen } from 'lucide-react';
import { GlassButton } from './components/shared';
import { chatStorage } from './services/chatStorage';
import { authService } from './services/auth';
import { initScaleManager, destroyScaleManager } from './services/scaleManager';
import { initUIConfig } from './services/uiConfig';
import { Chat, Message, User } from './types';
import { ThemeProvider } from './src/contexts/ThemeContext';

const SkhootLogo = memo(({ size = 24 }: { size?: number }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} />
));
SkhootLogo.displayName = 'SkhootLogo';

const AppContent: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'none' | 'login' | 'register'>('none');
  
  // Track pending chat creation to avoid remounting during first message
  const pendingChatIdRef = useRef<string | null>(null);

  // Load chats and auth state on mount
  useEffect(() => {
    initUIConfig();
    initScaleManager();
    return () => {
      destroyScaleManager();
    };
  }, []);

  useEffect(() => {
    const loadedChats = chatStorage.getChats();
    setChats(loadedChats);
    
    const authState = authService.getStoredAuth();
    if (authState.isAuthenticated && authState.user) {
      setUser(authState.user);
    }
  }, []);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [isTraceabilityOpen, setIsTraceabilityOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    pendingChatIdRef.current = null; // Clear any pending chat
    setCurrentChatId(null); // Set to null to start a fresh chat
    setIsSidebarOpen(false);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    pendingChatIdRef.current = null; // Clear any pending chat
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
  }, []);

  const handleDeleteChat = useCallback((chatId: string) => {
    chatStorage.deleteChat(chatId);
    setChats(chatStorage.getChats());
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  const handleMessagesChange = useCallback((messages: Message[]) => {
    // Only create/save chat if there are actually messages (user has sent something)
    if (messages.length === 0) return;
    
    if (!currentChatId && !pendingChatIdRef.current) {
      // Create a new chat only when user sends first message
      const newChat = chatStorage.createChat();
      pendingChatIdRef.current = newChat.id;
      newChat.messages = messages;
      newChat.title = chatStorage.generateTitle(messages);
      newChat.updatedAt = new Date();
      chatStorage.saveChat(newChat);
      setChats(chatStorage.getChats());
      // NE PAS changer currentChatId immédiatement pour éviter le remount
      // setCurrentChatId(newChat.id); 
    } else {
      // Update existing chat (use pending ID if we just created one)
      const chatId = currentChatId || pendingChatIdRef.current;
      if (chatId) {
        const chat = chatStorage.getChat(chatId);
        if (chat) {
          chat.messages = messages;
          chat.title = chatStorage.generateTitle(messages);
          chat.updatedAt = new Date();
          chatStorage.saveChat(chat);
          setChats(chatStorage.getChats());
          
          // Maintenant que nous avons une conversation complète, mettre à jour currentChatId
          if (!currentChatId && pendingChatIdRef.current && messages.length >= 2) {
            // Attendre que la conversation soit complète (user + assistant)
            setCurrentChatId(pendingChatIdRef.current);
            pendingChatIdRef.current = null;
          }
        }
      }
    }
  }, [currentChatId]);

  // Get current chat's messages
  const currentChat = currentChatId ? chats.find(c => c.id === currentChatId) : null;

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(open => !open);
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const handleSignIn = useCallback(() => setAuthView('login'), []);
  const handleSignOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);
  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setAuthView('none');
  }, []);
  const handleCloseAuth = useCallback(() => setAuthView('none'), []);
  
  const openUserPanel = useCallback(() => setIsUserPanelOpen(true), []);
  const closeUserPanel = useCallback(() => setIsUserPanelOpen(false), []);
  
  const openFilesPanel = useCallback(() => setIsFilesPanelOpen(true), []);
  const closeFilesPanel = useCallback(() => setIsFilesPanelOpen(false), []);
  
  const openTraceability = useCallback(() => {
    setIsSettingsOpen(false);
    setIsTraceabilityOpen(true);
  }, []);
  const closeTraceability = useCallback(() => setIsTraceabilityOpen(false), []);

  const handleClose = useCallback(async () => {
    try {
      const [{ getCurrent }, { exit }] = await Promise.all([
        import('@tauri-apps/api/window'),
        import('@tauri-apps/api/app'),
      ]);
      await getCurrent().close();
      await exit(0);
    } catch {
      window.close();
    }
  }, []);

  const startWindowDrag = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  }, []);

  const handleDragMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;
    try {
      await startWindowDrag();
    } catch {
      // noop
    }
  }, [startWindowDrag]);

  const handleBackgroundDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return;
    try {
      await startWindowDrag();
    } catch {
      // noop
    }
  }, [startWindowDrag]);

  const handleResizeMouseDown = useCallback(async (direction: 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West') => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startResizeDragging(direction);
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-bg-primary">
      {/* Resize handles (borderless window) */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="absolute top-0 left-0 right-0 h-6 cursor-n-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('North')} />
        <div className="absolute bottom-0 left-0 right-0 h-6 cursor-s-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('South')} />
        <div className="absolute top-0 bottom-0 left-0 w-6 cursor-w-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('West')} />
        <div className="absolute top-0 bottom-0 right-0 w-6 cursor-e-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('East')} />
        <div className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('NorthWest')} />
        <div className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('NorthEast')} />
        <div className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('SouthWest')} />
        <div className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize pointer-events-auto" onMouseDown={() => handleResizeMouseDown('SouthEast')} />
      </div>
      {/* Background blurs */}
      <BackgroundBlur position="top-[5%] left-[15%]" />
      <BackgroundBlur position="bottom-[5%] right-[15%]" />

      {/* Main container */}
      <div className="relative z-10 w-full h-full flex flex-col rounded-[32px] shadow-2xl overflow-hidden glass-elevated">
        {/* Header */}
        <header
          className="relative z-30 px-6 py-5 flex items-center justify-between cursor-move select-none"
          onMouseDown={handleDragMouseDown}
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
              onClick={toggleSidebar}
              data-no-drag
              className="relative z-10 p-1.5 hover:bg-black/5 rounded-lg transition-all text-text-secondary active:scale-95"
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
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
              className={`flex items-center gap-2 relative z-10 transition-all duration-500 ${
                isSidebarOpen ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'
              }`}
            >
              <SkhootLogo size={18} />
              <span className="text-sm font-black tracking-[0.2em] font-jakarta text-fuku-brand">
                SKHOOT
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative z-10" data-no-drag>
            <GlassButton onClick={openFilesPanel} aria-label="Utility">
              <FolderOpen size={18} />
            </GlassButton>
            <GlassButton onClick={openUserPanel} aria-label="User profile">
              <UserIcon size={18} />
            </GlassButton>
            <GlassButton onClick={openSettings} aria-label="Settings">
              <Settings size={18} />
            </GlassButton>
            <GlassButton 
              onClick={handleClose} 
              className="hover:bg-red-500/10 hover:text-red-500"
              aria-label="Close"
            >
              <X size={18} />
            </GlassButton>
          </div>
        </header>

        {/* Sidebar - now starts from top */}
        <div 
          className={`absolute top-0 left-0 bottom-0 z-40 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar 
            onNewChat={handleNewChat} 
            onClose={toggleSidebar}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            chats={chats}
            currentChatId={currentChatId}
            user={user}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Settings */}
        {isSettingsOpen && <SettingsPanel onClose={closeSettings} onOpenTraceability={openTraceability} />}

        {/* Traceability/Activity Log */}
        {isTraceabilityOpen && <TraceabilityPanel onClose={closeTraceability} />}

        {/* Files Panel */}
        {isFilesPanelOpen && <FilesPanel onClose={closeFilesPanel} />}

        {/* Auth Views */}
        {authView === 'login' && (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setAuthView('register')} 
            onClose={handleCloseAuth} 
          />
        )}
        {authView === 'register' && (
          <Register 
            onRegister={handleLogin} 
            onSwitchToLogin={() => setAuthView('login')} 
            onClose={handleCloseAuth} 
          />
        )}
        
        {/* User Panel */}
        {isUserPanelOpen && <UserPanel onClose={closeUserPanel} />}

        {/* Main content */}
        <main
          className="flex-1 relative overflow-hidden flex flex-col p-2"
          onMouseDown={handleBackgroundDrag}
        >
          <div className="flex-1 relative overflow-hidden" data-tauri-drag-region="false">
            <ChatInterface 
              key={currentChatId ?? 'new-chat'} 
              chatId={currentChatId}
              initialMessages={currentChat?.messages || []}
              onMessagesChange={handleMessagesChange}
            />
          </div>
        </main>

      </div>
    </div>
  );
};

const BackgroundBlur = memo<{ position: string }>(({ position }) => (
  <div className={`absolute ${position} w-[600px] h-[600px] rounded-full blur-[150px] opacity-40 animate-pulse pointer-events-none bg-orchid-tint dark:bg-almost-aqua`} />
));
BackgroundBlur.displayName = 'BackgroundBlur';

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
