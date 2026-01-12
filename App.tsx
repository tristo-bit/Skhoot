import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/layout/Sidebar';
import ChatInterface from './components/chat/ChatInterface';
import SettingsPanel from './components/panels/SettingsPanel';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import UserPanel from './components/settings/UserPanel';
import FilesPanel from './components/panels/FilesPanel';
import { ActivityPanel } from './components/activity';
import { FileSearchTest } from './components/search-engine';
import { Header, ResizeHandles, AppBackground } from './components/layout';
import { Background3D } from './components/customization';
import { useTauriWindow } from './hooks';
import { chatStorage } from './services/chatStorage';
import { authService } from './services/auth';
import { initScaleManager, destroyScaleManager } from './services/scaleManager';
import { initUIConfig } from './services/uiConfig';
import { demoModeService } from './services/demoMode';
import { Chat, Message, User } from './types';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SettingsProvider } from './src/contexts/SettingsContext';

// Wrapper to provide settings with resolved theme
const SettingsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  return (
    <SettingsProvider resolvedTheme={resolvedTheme}>
      {children}
    </SettingsProvider>
  );
};

const AppContent: React.FC = () => {
  // Tauri window management
  const { handleClose, handleDragMouseDown, handleBackgroundDrag, handleResizeStart } = useTauriWindow();

  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'none' | 'login' | 'register'>('none');
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isFileSearchTestOpen, setIsFileSearchTestOpen] = useState(false);
  
  // Track pending chat creation to avoid remounting during first message
  const pendingChatIdRef = useRef<string | null>(null);
  
  // Demo mode state
  const [isDemoMode] = useState(() => demoModeService.isDemoMode());

  // Initialize services
  useEffect(() => {
    initUIConfig();
    initScaleManager();
    
    // Start demo mode if enabled
    if (demoModeService.isDemoMode()) {
      // Small delay to let the app render first
      setTimeout(() => demoModeService.start(), 1500);
    }
    
    return () => {
      destroyScaleManager();
      demoModeService.stop();
    };
  }, []);

  // Load chats and auth state
  useEffect(() => {
    setChats(chatStorage.getChats());
    
    const authState = authService.getStoredAuth();
    if (authState.isAuthenticated && authState.user) {
      setUser(authState.user);
    }

    // Keyboard shortcut for file search test
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsFileSearchTestOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Chat handlers
  const handleNewChat = useCallback(() => {
    pendingChatIdRef.current = null;
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    pendingChatIdRef.current = null;
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
    if (messages.length === 0) return;
    
    if (!currentChatId && !pendingChatIdRef.current) {
      const newChat = chatStorage.createChat();
      pendingChatIdRef.current = newChat.id;
      newChat.messages = messages;
      newChat.title = chatStorage.generateTitle(messages);
      newChat.updatedAt = new Date();
      chatStorage.saveChat(newChat);
      setChats(chatStorage.getChats());
    } else {
      const chatId = currentChatId || pendingChatIdRef.current;
      if (chatId) {
        const chat = chatStorage.getChat(chatId);
        if (chat) {
          chat.messages = messages;
          chat.title = chatStorage.generateTitle(messages);
          chat.updatedAt = new Date();
          chatStorage.saveChat(chat);
          setChats(chatStorage.getChats());
          
          if (!currentChatId && pendingChatIdRef.current && messages.length >= 2) {
            setCurrentChatId(pendingChatIdRef.current);
            pendingChatIdRef.current = null;
          }
        }
      }
    }
  }, [currentChatId]);

  const currentChat = currentChatId ? chats.find(c => c.id === currentChatId) : null;

  // UI handlers
  const toggleSidebar = useCallback(() => setIsSidebarOpen(open => !open), []);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const openUserPanel = useCallback(() => setIsUserPanelOpen(true), []);
  const closeUserPanel = useCallback(() => setIsUserPanelOpen(false), []);
  const openFilesPanel = useCallback(() => setIsFilesPanelOpen(true), []);
  const closeFilesPanel = useCallback(() => setIsFilesPanelOpen(false), []);
  const openActivity = useCallback(() => setIsActivityOpen(true), []);
  const closeActivity = useCallback(() => setIsActivityOpen(false), []);
  const closeFileSearchTest = useCallback(() => setIsFileSearchTestOpen(false), []);

  // Auth handlers
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

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <ResizeHandles onResizeStart={handleResizeStart} />

      <div className="app-shell relative z-10 w-full h-full flex flex-col shadow-2xl overflow-hidden bg-bg-primary rounded-[var(--app-radius)]">
        <div className="app-glass relative z-10 w-full h-full flex flex-col overflow-hidden glass-elevated rounded-[var(--app-radius)]">
          {/* Background layers */}
          <Background3D />
          <AppBackground activeMode={activeQuickAction} />
          
          <Header
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={isDemoMode ? () => {} : toggleSidebar}
            onOpenHistory={isDemoMode ? () => {} : openActivity}
            onOpenFiles={isDemoMode ? () => {} : openFilesPanel}
            onOpenUser={isDemoMode ? () => {} : openUserPanel}
            onOpenSettings={isDemoMode ? () => {} : openSettings}
            onClose={isDemoMode ? () => {} : handleClose}
            onDragMouseDown={handleDragMouseDown}
          />

          {/* Sidebar - hidden in demo mode */}
          {!isDemoMode && (
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
          )}

          {/* Panels - hidden in demo mode */}
          {!isDemoMode && isSettingsOpen && <SettingsPanel onClose={closeSettings} />}
          {!isDemoMode && isActivityOpen && <ActivityPanel onClose={closeActivity} />}
          {!isDemoMode && isFilesPanelOpen && <FilesPanel onClose={closeFilesPanel} />}
          {!isDemoMode && isUserPanelOpen && <UserPanel onClose={closeUserPanel} />}
          {!isDemoMode && isFileSearchTestOpen && <FileSearchTest onClose={closeFileSearchTest} />}

          {/* Auth Views - hidden in demo mode */}
          {!isDemoMode && authView === 'login' && (
            <Login 
              onLogin={handleLogin} 
              onSwitchToRegister={() => setAuthView('register')} 
              onClose={handleCloseAuth} 
            />
          )}
          {!isDemoMode && authView === 'register' && (
            <Register 
              onRegister={handleLogin} 
              onSwitchToLogin={() => setAuthView('login')} 
              onClose={handleCloseAuth} 
            />
          )}

          {/* Main content */}
          <main
            className="flex-1 relative overflow-hidden flex flex-col p-2"
            onMouseDown={isDemoMode ? undefined : handleBackgroundDrag}
          >
            <div className="flex-1 relative overflow-hidden" data-tauri-drag-region="false">
              <ChatInterface 
                key={currentChatId ?? 'new-chat'} 
                chatId={currentChatId}
                initialMessages={currentChat?.messages || []}
                onMessagesChange={isDemoMode ? () => {} : handleMessagesChange}
                onActiveModeChange={setActiveQuickAction}
                isDemo={isDemoMode}
              />
            </div>
          </main>
          
          {/* Demo mode badge */}
          {isDemoMode && (
            <div className="absolute bottom-4 left-4 z-50 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm">
              <span className="text-xs font-medium text-purple-300">Demo Mode</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <SettingsWrapper>
      <AppContent />
    </SettingsWrapper>
  </ThemeProvider>
);

export default App;
