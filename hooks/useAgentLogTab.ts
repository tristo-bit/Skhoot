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
  
  // Track if we've auto-enabled
  const hasAutoEnabled = useRef(false);

  // Generate session ID for a conversation
  const generateSessionId = useCallback((convId: string) => {
    return `agent-${convId}-${Date.now()}`;
  }, []);

  // Enable agent mode - defined early so it can be used in useEffect
  const enableAgentMode = useCallback(async () => {
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
      
      if (!sessionId || !agentService.hasSession(sessionId)) {
        sessionId = generateSessionId(convId);
        console.log('[useAgentLogTab] Creating new session:', sessionId);
        await agentService.createSession(sessionId, defaultOptions);
        sessionMapRef.current.set(convId, sessionId);
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

  // Auto-enable agent mode on first mount if it's the default
  useEffect(() => {
    if (!hasAutoEnabled.current && getDefaultAgentMode()) {
      hasAutoEnabled.current = true;
      console.log('[useAgentLogTab] Auto-enabling agent mode on mount');
      
      // Retry logic for session creation (backend might not be ready immediately)
      const attemptEnable = async (retries = 3, delay = 500) => {
        for (let i = 0; i < retries; i++) {
          try {
            await new Promise(resolve => setTimeout(resolve, delay));
            await enableAgentMode();
            console.log('[useAgentLogTab] Agent mode enabled successfully');
            return;
          } catch (error) {
            console.warn(`[useAgentLogTab] Enable attempt ${i + 1}/${retries} failed:`, error);
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
          }
        }
        console.error('[useAgentLogTab] Failed to auto-enable agent mode after retries');
      };
      
      attemptEnable();
    }
  }, [enableAgentMode, getDefaultAgentMode]);

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
      
      // Remove from session map
      const convId = conversationId || 'default';
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
    };
  }, []);

  return {
    ...state,
    enableAgentMode,
    disableAgentMode,
    toggleAgentMode,
    closeAgentSession,
    getSessionId,
  };
}

export default useAgentLogTab;
