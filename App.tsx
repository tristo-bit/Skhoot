import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/layout/Sidebar';
import ChatInterface from './components/chat/ChatInterface';
import SettingsPanel from './components/panels/SettingsPanel';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import UserPanel from './components/settings/UserPanel';
import FilesPanel from './components/panels/BackupPanel';
import AgentsPanel from './components/panels/AgentsPanel';
import { AISettingsModal } from './components/panels/AISettingsModal';
import { ActivityPanel } from './components/activity';
import { FileSearchTest } from './components/search-engine';
import { Header, ResizeHandles, AppBackground } from './components/layout';
import { Background3D } from './components/customization';
import { useTauriWindow } from './hooks';
import { invoke } from '@tauri-apps/api/core';
import { chatStorage } from './services/chatStorage';
import { authService } from './services/auth';
import { initScaleManager, destroyScaleManager } from './services/scaleManager';
import { initUIConfig } from './services/uiConfig';
import { demoModeService } from './services/demoMode';
import { nativeNotifications } from './services/nativeNotifications';
import { tokenTrackingService } from './services/tokenTrackingService';
import { activityLogger } from './services/activityLogger';
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
  const { handleClose, handleMinimize, handleMaximize, handleDragMouseDown, handleBackgroundDrag, handleResizeStart } = useTauriWindow();

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
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(false);
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [newChatSession, setNewChatSession] = useState(0);
  const [workingDirectory, setWorkingDirectory] = useState<string>('~'); // Default to home
  
  // Track pending chat creation to avoid remounting during first message
  const pendingChatIdRef = useRef<string | null>(null);
  
  // Demo mode state
  const [isDemoMode] = useState(() => demoModeService.isDemoMode());

  // Initialize services
  useEffect(() => {
    initUIConfig();
    initScaleManager();
    
    // Check backend health
    const checkBackendHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          console.log('[App] Backend is healthy');
        }
      } catch (error) {
        console.warn('[App] Backend not responding, it may still be starting up');
      }
    };
    
    // Check immediately and then after a delay
    checkBackendHealth();
    setTimeout(checkBackendHealth, 3000);
    
    // Initialize notification service
    console.log('[App] Initializing notification service...');
    try {
      const debugInfo = nativeNotifications.getDebugInfo();
      console.log('[App] Notification service debug info:', debugInfo);
      
      // Send a test notification after a short delay to ensure everything is loaded
      setTimeout(async () => {
        try {
          console.log('[App] Sending startup test notification...');
          await nativeNotifications.info('Skhoot Started', 'Application loaded successfully!');
          console.log('[App] Startup notification sent successfully');
        } catch (error) {
          console.error('[App] Startup notification failed:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('[App] Failed to get notification debug info:', error);
    }
    
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

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F for file search test
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsFileSearchTestOpen(true);
      }
      // Ctrl+` for terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(open => !open);
      }
    };

    // Listen for open-api-config event to open UserPanel and scroll to API Configuration
    const handleOpenApiConfig = () => {
      setIsUserPanelOpen(true);
      // Dispatch event to scroll to API section after panel opens
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('scroll-to-api-config'));
      }, 100);
    };

    // Listen for open-ai-settings event
    const handleOpenAISettings = () => {
      setIsAISettingsOpen(true);
    };

    // Listen for AI-created terminals to auto-open terminal panel
    const handleAITerminalCreated = (event: CustomEvent) => {
      const { autoOpen = true } = event.detail;
      
      // Only auto-open if explicitly requested (default true for backwards compatibility)
      if (autoOpen) {
        setIsTerminalOpen(true);
        // Close other panels when opening terminal
        setIsFileExplorerOpen(false);
        setIsWorkflowsOpen(false);
      }
    };

    // Listen for open-terminal-panel event (from MiniTerminalView expand)
    const handleOpenTerminalPanel = () => {
      setIsTerminalOpen(true);
      setIsFileExplorerOpen(false);
      setIsWorkflowsOpen(false);
    };

    // Listen for navigate-to-message event (from ActivityPanel)
    const handleNavigateToMessage = (event: CustomEvent) => {
      const { chatId, messageId } = event.detail;
      console.log('[App] navigate-to-message event received', { chatId, messageId });
      
      if (chatId && messageId) {
        console.log('[App] Switching to chat:', chatId);
        // Switch to the chat
        setCurrentChatId(chatId);
        // Close activity panel
        setIsActivityOpen(false);
        // Dispatch event to highlight message - reduced delay for faster response
        setTimeout(() => {
          console.log('[App] Dispatching highlight-message event for:', messageId);
          window.dispatchEvent(new CustomEvent('highlight-message', { detail: { messageId } }));
        }, 200); // Reduced from 600ms to 200ms
      } else {
        console.warn('[App] Missing chatId or messageId in event');
      }
    };

    // Listen for find-message-chat event (when chatId is missing)
    const handleFindMessageChat = (event: CustomEvent) => {
      const { messageId } = event.detail;
      console.log('[App] find-message-chat event received', { 
        messageId, 
        currentChatId, 
        pendingChatId: pendingChatIdRef.current,
        totalChats: chats.length,
        chatsWithMessages: chats.map(c => ({ id: c.id, messageCount: c.messages.length, messageIds: c.messages.map(m => m.id) }))
      });
      
      // First check if the message is in the current chat (including pending)
      const currentChat = currentChatId ? chats.find(c => c.id === currentChatId) : null;
      if (currentChat && currentChat.messages.some(m => m.id === messageId)) {
        console.log('[App] Message found in current chat:', currentChatId);
        setIsActivityOpen(false);
        setTimeout(() => {
          console.log('[App] Dispatching highlight-message event for:', messageId);
          window.dispatchEvent(new CustomEvent('highlight-message', { detail: { messageId } }));
        }, 100); // Reduced from 600ms - message already in DOM
        return;
      }
      
      // Check if there's a pending chat
      if (pendingChatIdRef.current) {
        const pendingChat = chats.find(c => c.id === pendingChatIdRef.current);
        if (pendingChat && pendingChat.messages.some(m => m.id === messageId)) {
          console.log('[App] Message found in pending chat:', pendingChatIdRef.current);
          setCurrentChatId(pendingChatIdRef.current);
          pendingChatIdRef.current = null;
          setIsActivityOpen(false);
          setTimeout(() => {
            console.log('[App] Dispatching highlight-message event for:', messageId);
            window.dispatchEvent(new CustomEvent('highlight-message', { detail: { messageId } }));
          }, 200); // Reduced from 600ms
          return;
        }
      }
      
      // Find the chat that contains this message
      const chat = chats.find(c => c.messages.some(m => m.id === messageId));
      
      if (chat) {
        console.log('[App] Found chat:', chat.id);
        setCurrentChatId(chat.id);
        setIsActivityOpen(false);
        setTimeout(() => {
          console.log('[App] Dispatching highlight-message event for:', messageId);
          window.dispatchEvent(new CustomEvent('highlight-message', { detail: { messageId } }));
        }, 200); // Reduced from 600ms
      } else {
        console.warn('[App] Could not find chat containing message:', messageId);
        console.log('[App] This message may have been deleted or is from an old session');
        // Close activity panel anyway
        setIsActivityOpen(false);
      }
    };

    // Listen for close-activity-panel event
    const handleCloseActivityPanel = () => {
      console.log('[App] close-activity-panel event received');
      setIsActivityOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-api-config', handleOpenApiConfig);
    window.addEventListener('open-ai-settings', handleOpenAISettings);
    window.addEventListener('ai-terminal-created', handleAITerminalCreated);
    window.addEventListener('open-terminal-panel', handleOpenTerminalPanel);
    window.addEventListener('navigate-to-message', handleNavigateToMessage as EventListener);
    window.addEventListener('find-message-chat', handleFindMessageChat as EventListener);
    window.addEventListener('close-activity-panel', handleCloseActivityPanel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-api-config', handleOpenApiConfig);
      window.removeEventListener('open-ai-settings', handleOpenAISettings);
      window.removeEventListener('ai-terminal-created', handleAITerminalCreated);
      window.removeEventListener('open-terminal-panel', handleOpenTerminalPanel);
      window.removeEventListener('navigate-to-message', handleNavigateToMessage as EventListener);
      window.removeEventListener('find-message-chat', handleFindMessageChat as EventListener);
      window.removeEventListener('close-activity-panel', handleCloseActivityPanel);
    };
  }, []);

  // Chat handlers
  const handleNewChat = useCallback(() => {
    pendingChatIdRef.current = null;
    setCurrentChatId(null);
    setNewChatSession(prev => prev + 1);
    setIsSidebarOpen(false);
    // Reset conversation token counter
    tokenTrackingService.resetConversation();
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    pendingChatIdRef.current = null;
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
    // Reset conversation token counter for new conversation
    tokenTrackingService.resetConversation();
  }, []);

  const handleDeleteChat = useCallback((chatId: string) => {
    console.log('[App] Deleting chat:', chatId);
    chatStorage.deleteChat(chatId);
    setChats(chatStorage.getChats());
    
    // Mark all activity logs for this chat as deleted
    console.log('[App] Marking activity logs as deleted for chat:', chatId);
    activityLogger.markChatAsDeleted(chatId);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  const handleMessagesChange = useCallback(async (messages: Message[]) => {
    if (messages.length === 0) return;
    
    if (!currentChatId && !pendingChatIdRef.current) {
      const newChat = chatStorage.createChat();
      pendingChatIdRef.current = newChat.id;
      newChat.messages = messages;
      newChat.title = chatStorage.generateTitle(messages);
      newChat.updatedAt = new Date();
      chatStorage.saveChat(newChat);
      setChats(chatStorage.getChats());
      
      // Send notification for new conversation
      await nativeNotifications.info(
        'New Conversation Started',
        `Created: "${newChat.title}"`,
        {
          tag: 'new-conversation',
          data: { chatId: newChat.id, title: newChat.title }
        }
      );
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
  const toggleTerminal = useCallback(() => {
    setIsTerminalOpen(open => {
      if (!open) {
        // Opening terminal, close other panels
        setIsFileExplorerOpen(false);
        setIsWorkflowsOpen(false);
      }
      return !open;
    });
  }, []);
  const closeTerminal = useCallback(() => setIsTerminalOpen(false), []);
  const toggleFileExplorer = useCallback(() => {
    setIsFileExplorerOpen(open => {
      if (!open) {
        // Opening file explorer, close other panels
        setIsTerminalOpen(false);
        setIsWorkflowsOpen(false);
      }
      return !open;
    });
  }, []);
  const closeFileExplorer = useCallback(() => setIsFileExplorerOpen(false), []);
  const toggleWorkflows = useCallback(() => {
    setIsWorkflowsOpen(open => {
      if (!open) {
        // Opening workflows, close other panels
        setIsTerminalOpen(false);
        setIsFileExplorerOpen(false);
        setIsAgentsOpen(false);
      }
      return !open;
    });
  }, []);
  const closeWorkflows = useCallback(() => setIsWorkflowsOpen(false), []);
  const toggleAgents = useCallback(() => {
    setIsAgentsOpen(open => {
      if (!open) {
        // Opening agents, close other panels
        setIsTerminalOpen(false);
        setIsFileExplorerOpen(false);
        setIsWorkflowsOpen(false);
      }
      return !open;
    });
  }, []);
  const closeAgents = useCallback(() => setIsAgentsOpen(false), []);
  const openAISettings = useCallback(() => setIsAISettingsOpen(true), []);
  const closeAISettings = useCallback(() => setIsAISettingsOpen(false), []);

  // Handle QuickAction panel opening - close other panels when opening a new one
  const handleQuickActionMode = useCallback((mode: string | null) => {
    setActiveQuickAction(mode);
    
    // Close all panels first, then open the selected one
    if (mode === 'Files') {
      setIsTerminalOpen(false);
      setIsWorkflowsOpen(false);
      setIsAgentsOpen(false);
      setIsFileExplorerOpen(true);
    } else if (mode === 'Agents') {
      setIsTerminalOpen(false);
      setIsFileExplorerOpen(false);
      setIsWorkflowsOpen(false);
      setIsAgentsOpen(true);
    } else if (mode === 'Workflows') {
      setIsTerminalOpen(false);
      setIsFileExplorerOpen(false);
      setIsAgentsOpen(false);
      setIsWorkflowsOpen(true);
    } else if (mode === 'Terminal') {
      setIsFileExplorerOpen(false);
      setIsWorkflowsOpen(false);
      setIsAgentsOpen(false);
      setIsTerminalOpen(true);
    } else {
      // If mode is null, close all panels
      setIsTerminalOpen(false);
      setIsFileExplorerOpen(false);
      setIsWorkflowsOpen(false);
      setIsAgentsOpen(false);
    }
  }, []);

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

  // Handle working directory change
  const handleSetWorkingDirectory = useCallback(async () => {
    try {
      // Use our custom Rust command instead of the plugin JS API
      // This is often more reliable on Linux/Tauri v2
      const selected = await invoke<string | null>('pick_folder');
      
      if (selected) {
        console.log('[App] Working directory changed:', selected);
        setWorkingDirectory(selected);
      }
    } catch (error) {
      console.error('[App] Failed to select directory:', error);
    }
  }, []);

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
            onToggleSidebar={toggleSidebar}
            onOpenHistory={openActivity}
            onOpenFiles={openFilesPanel}
            onOpenUser={openUserPanel}
            onOpenSettings={openSettings}
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
          />

          {/* Sidebar - rendered via portal */}
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
            isOpen={isSidebarOpen}
            workingDirectory={workingDirectory}
            onSetWorkingDirectory={handleSetWorkingDirectory}
          />

          {/* Panels */}
          {isSettingsOpen && <SettingsPanel onClose={closeSettings} />}
          {isActivityOpen && <ActivityPanel onClose={closeActivity} />}
          {isFilesPanelOpen && <FilesPanel onClose={closeFilesPanel} />}
          {isUserPanelOpen && <UserPanel onClose={closeUserPanel} />}
          {isFileSearchTestOpen && <FileSearchTest onClose={closeFileSearchTest} />}
          {isAISettingsOpen && <AISettingsModal onClose={closeAISettings} />}
          {isAgentsOpen && <AgentsPanel isOpen={isAgentsOpen} onClose={closeAgents} />}

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

          {/* Main content */}
          <main
            className="flex-1 relative overflow-hidden flex flex-col p-2"
            onMouseDown={handleBackgroundDrag}
          >
            <div className="flex-1 relative overflow-hidden" data-tauri-drag-region="false">
                <ChatInterface 
                key={currentChatId ?? `new-chat-${newChatSession}`} 
                chatId={currentChatId}
                getPendingChatId={() => pendingChatIdRef.current}
                initialMessages={currentChat?.messages || []}
                onMessagesChange={isDemoMode ? () => {} : handleMessagesChange}
                onActiveModeChange={handleQuickActionMode}
                isTerminalOpen={isTerminalOpen}
                onToggleTerminal={toggleTerminal}
                isFileExplorerOpen={isFileExplorerOpen}
                onToggleFileExplorer={toggleFileExplorer}
                isWorkflowsOpen={isWorkflowsOpen}
                onToggleWorkflows={toggleWorkflows}
                isAgentsOpen={isAgentsOpen}
                onToggleAgents={toggleAgents}
                workingDirectory={workingDirectory}
              />
            </div>

          </main>
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
