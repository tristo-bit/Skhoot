import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsPanel from './components/SettingsPanel';
import Login from './components/Login';
import Register from './components/Register';
import UserPanel from './components/UserPanel';
import FilesPanel from './components/FilesPanel';
import TraceabilityPanel from './components/TraceabilityPanel';
import { COLORS, THEME } from './constants';
import { Menu, X, Settings, User as UserIcon, FolderOpen } from 'lucide-react';
import { GlassButton } from './components/shared';
import { chatStorage } from './services/chatStorage';
import { authService } from './services/auth';
import { Chat, Message, User } from './types';

const SkhootLogo = memo(({ size = 24 }: { size?: number }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} />
));
SkhootLogo.displayName = 'SkhootLogo';

const App: React.FC = () => {
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

  const handleClose = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div 
      className="flex h-screen w-full items-center justify-center p-4 overflow-hidden" 
      style={{ backgroundColor: THEME.background }}
    >
      {/* Background blurs */}
      <BackgroundBlur position="top-[5%] left-[15%]" color={COLORS.orchidTint} />
      <BackgroundBlur position="bottom-[5%] right-[15%]" color={COLORS.almostAqua} />

      {/* Main container */}
      <div 
        className="relative z-10 w-full max-w-[480px] h-[720px] flex flex-col rounded-[40px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden" 
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.4)', 
          backdropFilter: 'blur(30px)' 
        }}
      >
        {/* Header */}
        <header className="relative z-30 px-6 py-5 flex items-center justify-between">
          {/* Left side with morphing background */}
          <div className="flex items-center gap-4 relative">
            {/* Morphing background that extends from sidebar */}
            <div 
              className={`absolute -left-6 -top-5 -bottom-5 rounded-r-3xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
              }`}
              style={{ 
                backgroundColor: THEME.sidebar,
              }}
            >
              <div className="absolute inset-0 bg-black/5 rounded-r-3xl" />
            </div>
            
            <button 
              onClick={toggleSidebar}
              className="relative z-10 p-1.5 hover:bg-black/5 rounded-lg transition-all text-gray-600 active:scale-95"
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
              <span 
                className="text-sm font-black tracking-[0.2em] font-jakarta" 
                style={{ color: COLORS.fukuBrand }}
              >
                SKHOOT
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
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
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <ChatInterface 
            key={currentChatId ?? 'new-chat'} 
            chatId={currentChatId}
            initialMessages={currentChat?.messages || []}
            onMessagesChange={handleMessagesChange}
          />
        </main>
      </div>
    </div>
  );
};

const BackgroundBlur = memo<{ position: string; color: string }>(({ position, color }) => (
  <div 
    className={`absolute ${position} w-[600px] h-[600px] rounded-full blur-[150px] opacity-40 animate-pulse pointer-events-none`} 
    style={{ backgroundColor: color }} 
  />
));
BackgroundBlur.displayName = 'BackgroundBlur';

export default App;
