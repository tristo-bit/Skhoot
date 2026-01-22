/**
 * useAgentLogTab Hook
 * 
 * Manages the Agent Log tab lifecycle, including:
 * - Auto-creation when agent mode is enabled
 * - Tab persistence across conversation switches
 * - Cleanup when agent mode is disabled
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { agentService, AgentSessionOptions } from '../services/agentService';
import { terminalService } from '../services/terminal/terminalService';
import { terminalContextStore } from '../services/agentTools/terminalTools';
import { isTauriApp } from '../services/tauriDetection';

export interface AgentLogTabState {
  /** Whether agent mode is enabled */
  isAgentMode: boolean;
  /** Current agent session ID (if any) */
  agentSessionId: string | null;
  /** Whether the agent log tab should be shown */
  shouldShowAgentLog: boolean;
  /** Loading state for agent session creation */
  isCreatingSession: boolean;
  /** Error message if session creation failed */
  error: string | null;
}

export interface UseAgentLogTabOptions {
  /** Conversation/chat ID */
  conversationId: string | null;
  /** Default agent session options */
  defaultOptions?: AgentSessionOptions;
  /** Callback when agent mode changes */
  onAgentModeChange?: (isAgentMode: boolean) => void;
  /** Callback when agent session is created */
  onSessionCreated?: (sessionId: string) => void;
  /** Callback when agent session is closed */
  onSessionClosed?: (sessionId: string) => void;
}

export interface UseAgentLogTabReturn extends AgentLogTabState {
  /** Enable agent mode (creates session and shows log tab) */
  enableAgentMode: () => Promise<void>;
  /** Disable agent mode (closes session but keeps log for reference) */
  disableAgentMode: () => Promise<void>;
  /** Toggle agent mode */
  toggleAgentMode: () => Promise<void>;
  /** Close the agent session completely */
  closeAgentSession: () => Promise<void>;
  /** Get the session ID for the current conversation */
  getSessionId: () => string | null;
  /** Get the terminal session ID for the current conversation */
  getTerminalSessionId: () => string | null;
}

/**
 * Hook for managing Agent Log tab lifecycle
 */
export function useAgentLogTab(options: UseAgentLogTabOptions): UseAgentLogTabReturn {
  const { 
    conversationId, 
    defaultOptions,
    onAgentModeChange,
    onSessionCreated,
    onSessionClosed,
  } = options;

  // Check localStorage for agent mode preference (default: true)
  const getDefaultAgentMode = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('skhoot_agent_mode_default');
    return saved !== 'false'; // Default to true unless explicitly disabled
  }, []);

  const [state, setState] = useState<AgentLogTabState>({
    isAgentMode: false,
    agentSessionId: null,
    shouldShowAgentLog: false,
    isCreatingSession: false,
    error: null,
  });

  // Ref to track current state for async operations
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Track sessions per conversation
  const sessionMapRef = useRef<Map<string, string>>(new Map());
  
  // Track terminal sessions per conversation
  const terminalSessionMapRef = useRef<Map<string, string>>(new Map());
  
  // Track if we've auto-enabled
  const hasAutoEnabled = useRef(false);
  
  // Ref to hold the latest enableAgentMode function
  const enableAgentModeRef = useRef<(() => Promise<void>) | null>(null);

  // Generate session ID for a conversation
  const generateSessionId = useCallback((convId: string) => {
    return `agent-${convId}-${Date.now()}`;
  }, []);

  // Enable agent mode - defined early so it can be used in useEffect
  const enableAgentMode = useCallback(async () => {
    // Check if we're in Tauri mode - agent features require Tauri
    if (!isTauriApp()) {
      console.log('[useAgentLogTab] Not in Tauri mode, agent features unavailable');
      setState(prev => ({
        ...prev,
        isCreatingSession: false,
        error: 'Agent mode requires the Tauri desktop app. Run "npm run tauri dev" to use agent features.',
      }));
      return;
    }
    
    // Check current state to avoid duplicate creation
    const currentState = stateRef.current;
    if (currentState.isCreatingSession || currentState.isAgentMode) {
      console.log('[useAgentLogTab] Already creating or enabled, skipping');
      return;
    }
    
    // Set creating state
    setState(prev => ({ ...prev, isCreatingSession: true, error: null }));
    
    const convId = conversationId || 'default';
    
    try {
      let sessionId = sessionMapRef.current.get(convId);
      let terminalSessionId = terminalSessionMapRef.current.get(convId);
      
      if (!sessionId || !agentService.hasSession(sessionId)) {
        sessionId = generateSessionId(convId);
        console.log('[useAgentLogTab] Creating new session:', sessionId);
        await agentService.createSession(sessionId, defaultOptions);
        sessionMapRef.current.set(convId, sessionId);
        
        // Create a dedicated terminal session for this conversation
        console.log('[useAgentLogTab] Creating terminal session for conversation');
        terminalSessionId = await terminalService.createSession('shell');
        terminalSessionMapRef.current.set(convId, terminalSessionId);
        
        // Register the terminal as AI-created
        terminalContextStore.register(terminalSessionId, {
          sessionId,
          createdBy: 'ai',
          workspaceRoot: undefined,
        });
        
        // Emit event to show terminal in panel (but don't auto-open panel)
        window.dispatchEvent(new CustomEvent('ai-terminal-created', {
          detail: {
            sessionId: terminalSessionId,
            type: 'shell',
            createdBy: 'ai',
            agentSessionId: sessionId,
            autoOpen: false, // Don't auto-open for conversation terminals
          }
        }));
        
        console.log('[useAgentLogTab] Terminal session created:', terminalSessionId);
        
        onSessionCreated?.(sessionId);
      }

      setState(prev => ({
        ...prev,
        isAgentMode: true,
        agentSessionId: sessionId!,
        shouldShowAgentLog: true,
        isCreatingSession: false,
      }));

      onAgentModeChange?.(true);
      console.log('[useAgentLogTab] Agent mode enabled with session:', sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[useAgentLogTab] Failed to enable agent mode:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isCreatingSession: false,
        error: errorMessage,
      }));
      
      throw error; // Re-throw so retry logic can catch it
    }
  }, [conversationId, defaultOptions, generateSessionId, onAgentModeChange, onSessionCreated]);

  // Keep ref updated with latest enableAgentMode
  useEffect(() => {
    enableAgentModeRef.current = enableAgentMode;
  }, [enableAgentMode]);

  // Auto-enable agent mode on first mount if it's the default (only in Tauri mode)
  useEffect(() => {
    // Use a small delay to ensure Tauri globals are initialized
    const checkAndEnable = async () => {
      // Wait a tick for Tauri to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Skip auto-enable in web mode - agent features require Tauri
      if (!isTauriApp()) {
        console.log('[useAgentLogTab] Skipping auto-enable in web mode');
        return;
      }
      
      if (!hasAutoEnabled.current && getDefaultAgentMode()) {
        hasAutoEnabled.current = true;
        console.log('[useAgentLogTab] Auto-enabling agent mode on mount');
        
        // Retry logic for session creation (backend might not be ready immediately)
        for (let i = 0; i < 3; i++) {
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            // Use ref to get latest enableAgentMode function
            if (enableAgentModeRef.current) {
              await enableAgentModeRef.current();
            }
            console.log('[useAgentLogTab] Agent mode enabled successfully');
            return;
          } catch (error) {
            console.warn(`[useAgentLogTab] Enable attempt ${i + 1}/3 failed:`, error);
            if (i < 2) {
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            }
          }
        }
        console.error('[useAgentLogTab] Failed to auto-enable agent mode after retries');
      }
    };
    
    checkAndEnable();
  }, []); // Empty deps - only run once on mount

  // Disable agent mode (keeps log visible for reference)
  const disableAgentMode = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isAgentMode: false,
    }));
    onAgentModeChange?.(false);
  }, [onAgentModeChange]);

  // Toggle agent mode
  const toggleAgentMode = useCallback(async () => {
    if (state.isAgentMode) {
      await disableAgentMode();
    } else {
      await enableAgentMode();
    }
  }, [state.isAgentMode, enableAgentMode, disableAgentMode]);

  // Close agent session completely
  const closeAgentSession = useCallback(async () => {
    const sessionId = state.agentSessionId;
    if (!sessionId) return;

    try {
      await agentService.closeSession(sessionId);
      
      // Close the terminal session too
      const convId = conversationId || 'default';
      const terminalSessionId = terminalSessionMapRef.current.get(convId);
      if (terminalSessionId) {
        await terminalService.closeSession(terminalSessionId);
        terminalSessionMapRef.current.delete(convId);
      }
      
      // Remove from session map
      sessionMapRef.current.delete(convId);
      
      setState(prev => ({
        ...prev,
        isAgentMode: false,
        agentSessionId: null,
        shouldShowAgentLog: false,
      }));

      onSessionClosed?.(sessionId);
      onAgentModeChange?.(false);
    } catch (error) {
      console.error('[useAgentLogTab] Failed to close agent session:', error);
    }
  }, [state.agentSessionId, conversationId, onSessionClosed, onAgentModeChange]);

  // Get session ID for current conversation
  const getSessionId = useCallback(() => {
    return state.agentSessionId;
  }, [state.agentSessionId]);

  // Get terminal session ID for current conversation
  const getTerminalSessionId = useCallback(() => {
    const convId = conversationId || 'default';
    return terminalSessionMapRef.current.get(convId) || null;
  }, [conversationId]);

  // Handle conversation change - restore session if exists
  useEffect(() => {
    const convId = conversationId || 'default';
    const existingSessionId = sessionMapRef.current.get(convId);

    if (existingSessionId && agentService.hasSession(existingSessionId)) {
      // Restore existing session
      setState(prev => ({
        ...prev,
        agentSessionId: existingSessionId,
        shouldShowAgentLog: prev.isAgentMode,
      }));
    } else {
      // No session for this conversation
      setState(prev => ({
        ...prev,
        agentSessionId: null,
        shouldShowAgentLog: false,
      }));
    }
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all sessions when component unmounts
      sessionMapRef.current.forEach(async (sessionId) => {
        try {
          await agentService.closeSession(sessionId);
        } catch (error) {
          console.error('[useAgentLogTab] Failed to cleanup session:', sessionId, error);
        }
      });
      sessionMapRef.current.clear();
      
      // Close all terminal sessions
      terminalSessionMapRef.current.forEach(async (terminalSessionId) => {
        try {
          await terminalService.closeSession(terminalSessionId);
        } catch (error) {
          console.error('[useAgentLogTab] Failed to cleanup terminal session:', terminalSessionId, error);
        }
      });
      terminalSessionMapRef.current.clear();
    };
  }, []);

  return {
    ...state,
    enableAgentMode,
    disableAgentMode,
    toggleAgentMode,
    closeAgentSession,
    getSessionId,
    getTerminalSessionId,
  };
}

export default useAgentLogTab;
