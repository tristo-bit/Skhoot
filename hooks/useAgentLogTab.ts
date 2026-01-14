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

  const [state, setState] = useState<AgentLogTabState>({
    isAgentMode: false,
    agentSessionId: null,
    shouldShowAgentLog: false,
    isCreatingSession: false,
    error: null,
  });

  // Track sessions per conversation
  const sessionMapRef = useRef<Map<string, string>>(new Map());

  // Generate session ID for a conversation
  const generateSessionId = useCallback((convId: string) => {
    return `agent-${convId}-${Date.now()}`;
  }, []);

  // Enable agent mode
  const enableAgentMode = useCallback(async () => {
    if (state.isCreatingSession || state.isAgentMode) return;

    setState(prev => ({ ...prev, isCreatingSession: true, error: null }));

    try {
      const convId = conversationId || 'default';
      
      // Check if we already have a session for this conversation
      let sessionId = sessionMapRef.current.get(convId);
      
      if (!sessionId || !agentService.hasSession(sessionId)) {
        // Create new session
        sessionId = generateSessionId(convId);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[useAgentLogTab] Failed to enable agent mode:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isCreatingSession: false,
        error: errorMessage,
      }));
    }
  }, [conversationId, defaultOptions, state.isCreatingSession, state.isAgentMode, generateSessionId, onAgentModeChange, onSessionCreated]);

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
