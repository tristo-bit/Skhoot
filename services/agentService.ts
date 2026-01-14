/**
 * Agent Service
 * 
 * Manages CLI Agent sessions for AI-powered terminal operations.
 * Provides session lifecycle management, message handling, and tool execution.
 * 
 * @example
 * ```typescript
 * // Create an agent session
 * const session = await agentService.createSession('conv-123', {
 *   provider: 'google',
 *   model: 'gemini-2.0-flash',
 *   workingDirectory: '/home/user/project'
 * });
 * 
 * // Send a message
 * const userMsg = await agentService.sendMessage('conv-123', 'Find all TypeScript files');
 * 
 * // Listen for events
 * agentService.on('tool_start', (data) => console.log('Tool started:', data));
 * agentService.on('tool_complete', (data) => console.log('Tool completed:', data));
 * 
 * // Close when done
 * await agentService.closeSession('conv-123');
 * ```
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Agent session creation options
 */
export interface AgentSessionOptions {
  /** AI provider (openai, anthropic, google) */
  provider?: string;
  /** Model identifier */
  model?: string;
  /** Working directory for command execution */
  workingDirectory?: string;
  /** Temperature for generation (0.0 - 1.0) */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
}

/**
 * Agent session status
 */
export interface AgentStatus {
  sessionId: string;
  state: 'initializing' | 'ready' | 'processing' | 'executing_tool' | 'waiting_for_input' | 'error' | 'terminated';
  messageCount: number;
  pendingToolCalls: number;
  createdAt: number;
  lastActivity: number;
  provider: string;
  model: string;
}

/**
 * Agent message
 */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  timestamp: number;
}

/**
 * Tool call from AI
 */
export interface AgentToolCall {
  id: string;
  name: 'shell' | 'read_file' | 'write_file' | 'list_directory' | 'search_files';
  arguments: Record<string, any>;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

/**
 * Agent session configuration
 */
export interface AgentConfig {
  provider: string;
  model: string;
  workingDirectory: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Event types emitted by the agent service
 */
export type AgentEventType = 
  | 'message'
  | 'tool_start'
  | 'tool_complete'
  | 'status_change'
  | 'error'
  | 'cancelled';

/**
 * Event data for agent events
 */
export interface AgentEventData {
  sessionId: string;
  message?: AgentMessage;
  toolCall?: AgentToolCall;
  toolResult?: ToolResult;
  status?: AgentStatus;
  error?: string;
}

/**
 * Event listener callback
 */
export type AgentEventListener = (data: AgentEventData) => void;


// ============================================================================
// Agent Service Class
// ============================================================================

class AgentService {
  /** Active sessions by conversation ID */
  private sessions: Map<string, AgentStatus> = new Map();
  
  /** Event listeners */
  private eventListeners: Map<AgentEventType, Set<AgentEventListener>> = new Map();
  
  /** Tauri event unsubscribe functions */
  private tauriListeners: Map<string, UnlistenFn[]> = new Map();

  constructor() {
    // Initialize event listener maps
    const eventTypes: AgentEventType[] = ['message', 'tool_start', 'tool_complete', 'status_change', 'error', 'cancelled'];
    eventTypes.forEach(type => this.eventListeners.set(type, new Set()));
  }

  // ==========================================================================
  // Session Lifecycle
  // ==========================================================================

  /**
   * Create a new agent session for a conversation
   * 
   * @param sessionId - Unique session ID (typically conversation ID)
   * @param options - Session configuration options
   * @returns Agent status
   */
  async createSession(sessionId: string, options?: AgentSessionOptions): Promise<AgentStatus> {
    console.log('[AgentService] Creating session:', sessionId, options);

    try {
      const result = await invoke<any>('create_agent_session', {
        sessionId,
        options: options ? {
          provider: options.provider,
          model: options.model,
          working_directory: options.workingDirectory,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        } : null,
      });

      const status = this.mapStatus(result);
      this.sessions.set(sessionId, status);

      // Set up Tauri event listeners for this session
      await this.setupEventListeners(sessionId);

      console.log('[AgentService] Session created:', status);
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to create session:', errorMessage);
      this.emit('error', { sessionId, error: errorMessage });
      throw new Error(`Failed to create agent session: ${errorMessage}`);
    }
  }

  /**
   * Close an agent session
   * 
   * @param sessionId - Session ID to close
   */
  async closeSession(sessionId: string): Promise<void> {
    console.log('[AgentService] Closing session:', sessionId);

    try {
      // Remove Tauri event listeners
      await this.removeEventListeners(sessionId);

      await invoke('close_agent_session', { sessionId });
      this.sessions.delete(sessionId);

      console.log('[AgentService] Session closed:', sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to close session:', errorMessage);
      
      // Clean up local state even if backend fails
      this.sessions.delete(sessionId);
      throw new Error(`Failed to close agent session: ${errorMessage}`);
    }
  }

  /**
   * Get session status
   * 
   * @param sessionId - Session ID
   * @returns Agent status or undefined if not found
   */
  async getStatus(sessionId: string): Promise<AgentStatus | undefined> {
    try {
      const result = await invoke<any>('get_agent_status', { sessionId });
      const status = this.mapStatus(result);
      this.sessions.set(sessionId, status);
      return status;
    } catch (error) {
      console.error('[AgentService] Failed to get status:', error);
      return this.sessions.get(sessionId);
    }
  }

  /**
   * Check if a session exists
   * 
   * @param sessionId - Session ID
   * @returns True if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * List all active sessions
   * 
   * @returns Array of agent statuses
   */
  async listSessions(): Promise<AgentStatus[]> {
    try {
      const results = await invoke<any[]>('list_agent_sessions');
      const statuses = results.map(r => this.mapStatus(r));
      
      // Update local cache
      statuses.forEach(s => this.sessions.set(s.sessionId, s));
      
      return statuses;
    } catch (error) {
      console.error('[AgentService] Failed to list sessions:', error);
      return Array.from(this.sessions.values());
    }
  }

  /**
   * Get session configuration
   * 
   * @param sessionId - Session ID
   * @returns Agent configuration
   */
  async getConfig(sessionId: string): Promise<AgentConfig | undefined> {
    try {
      const result = await invoke<any>('get_agent_config', { sessionId });
      return {
        provider: result.provider,
        model: result.model,
        workingDirectory: result.working_directory,
        temperature: result.temperature,
        maxTokens: result.max_tokens,
      };
    } catch (error) {
      console.error('[AgentService] Failed to get config:', error);
      return undefined;
    }
  }

  // ==========================================================================
  // Messaging
  // ==========================================================================

  /**
   * Send a user message to the agent
   * 
   * @param sessionId - Session ID
   * @param message - Message content
   * @returns The created message
   */
  async sendMessage(sessionId: string, message: string): Promise<AgentMessage> {
    console.log('[AgentService] Sending message to session:', sessionId);

    try {
      const result = await invoke<any>('send_agent_message', {
        sessionId,
        message,
      });

      return this.mapMessage(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to send message:', errorMessage);
      this.emit('error', { sessionId, error: errorMessage });
      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  /**
   * Add an assistant message (with optional tool calls)
   * 
   * @param sessionId - Session ID
   * @param content - Message content
   * @param toolCalls - Optional tool calls
   * @returns The created message
   */
  async addAssistantMessage(
    sessionId: string,
    content: string,
    toolCalls?: AgentToolCall[]
  ): Promise<AgentMessage> {
    try {
      const result = await invoke<any>('add_assistant_message', {
        sessionId,
        content,
        toolCalls: toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
      });

      return this.mapMessage(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to add assistant message:', errorMessage);
      throw new Error(`Failed to add assistant message: ${errorMessage}`);
    }
  }

  /**
   * Get message history for a session
   * 
   * @param sessionId - Session ID
   * @returns Array of messages
   */
  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    try {
      const results = await invoke<any[]>('get_agent_messages', { sessionId });
      return results.map(r => this.mapMessage(r));
    } catch (error) {
      console.error('[AgentService] Failed to get messages:', error);
      return [];
    }
  }


  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool call
   * 
   * @param sessionId - Session ID
   * @param request - Tool execution request
   * @returns Tool result
   */
  async executeTool(sessionId: string, request: ToolExecutionRequest): Promise<ToolResult> {
    console.log('[AgentService] Executing tool:', request.toolName, 'for session:', sessionId);

    try {
      const result = await invoke<any>('execute_agent_tool', {
        sessionId,
        request: {
          tool_call_id: request.toolCallId,
          tool_name: request.toolName,
          arguments: request.arguments,
        },
      });

      return {
        toolCallId: result.tool_call_id,
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.duration_ms,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to execute tool:', errorMessage);
      this.emit('error', { sessionId, error: errorMessage });
      throw new Error(`Failed to execute tool: ${errorMessage}`);
    }
  }

  /**
   * Execute multiple tool calls in sequence
   * 
   * @param sessionId - Session ID
   * @param toolCalls - Array of tool calls to execute
   * @returns Array of tool results
   */
  async executeToolCalls(sessionId: string, toolCalls: AgentToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeTool(sessionId, {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Cancel the current agent action
   * 
   * @param sessionId - Session ID
   */
  async cancelAction(sessionId: string): Promise<void> {
    console.log('[AgentService] Cancelling action for session:', sessionId);

    try {
      await invoke('cancel_agent_action', { sessionId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AgentService] Failed to cancel action:', errorMessage);
      throw new Error(`Failed to cancel action: ${errorMessage}`);
    }
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to agent events
   * 
   * @param event - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on(event: AgentEventType, listener: AgentEventListener): () => void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }

    return () => {
      listeners?.delete(listener);
    };
  }

  /**
   * Unsubscribe from agent events
   * 
   * @param event - Event type
   * @param listener - Callback function to remove
   */
  off(event: AgentEventType, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(event);
    listeners?.delete(listener);
  }

  /**
   * Emit an event to all listeners
   * 
   * @private
   */
  private emit(event: AgentEventType, data: AgentEventData): void {
    const listeners = this.eventListeners.get(event);
    listeners?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[AgentService] Event listener error:', error);
      }
    });

    // Also emit as DOM event for components that prefer that pattern
    window.dispatchEvent(new CustomEvent(`agent:${event}`, { detail: data }));
  }

  /**
   * Set up Tauri event listeners for a session
   * 
   * @private
   */
  private async setupEventListeners(sessionId: string): Promise<void> {
    const unlisteners: UnlistenFn[] = [];

    try {
      // Listen for messages
      const unlistenMessage = await listen<any>(`agent:message:${sessionId}`, (event) => {
        const message = this.mapMessage(event.payload);
        this.emit('message', { sessionId, message });
      });
      unlisteners.push(unlistenMessage);

      // Listen for tool start
      const unlistenToolStart = await listen<any>(`agent:tool_start:${sessionId}`, (event) => {
        const toolCall = this.mapToolCall(event.payload);
        this.emit('tool_start', { sessionId, toolCall });
      });
      unlisteners.push(unlistenToolStart);

      // Listen for tool complete
      const unlistenToolComplete = await listen<any>(`agent:tool_complete:${sessionId}`, (event) => {
        const toolResult: ToolResult = {
          toolCallId: event.payload.tool_call_id,
          success: event.payload.success,
          output: event.payload.output,
          error: event.payload.error,
          durationMs: event.payload.duration_ms,
        };
        this.emit('tool_complete', { sessionId, toolResult });
      });
      unlisteners.push(unlistenToolComplete);

      // Listen for cancellation
      const unlistenCancelled = await listen(`agent:cancelled:${sessionId}`, () => {
        this.emit('cancelled', { sessionId });
      });
      unlisteners.push(unlistenCancelled);

      this.tauriListeners.set(sessionId, unlisteners);
    } catch (error) {
      console.error('[AgentService] Failed to setup event listeners:', error);
      // Clean up any listeners that were set up
      unlisteners.forEach(unlisten => unlisten());
    }
  }

  /**
   * Remove Tauri event listeners for a session
   * 
   * @private
   */
  private async removeEventListeners(sessionId: string): Promise<void> {
    const unlisteners = this.tauriListeners.get(sessionId);
    if (unlisteners) {
      unlisteners.forEach(unlisten => unlisten());
      this.tauriListeners.delete(sessionId);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Map backend status to frontend type
   * 
   * @private
   */
  private mapStatus(data: any): AgentStatus {
    return {
      sessionId: data.session_id,
      state: data.state,
      messageCount: data.message_count,
      pendingToolCalls: data.pending_tool_calls,
      createdAt: data.created_at,
      lastActivity: data.last_activity,
      provider: data.provider,
      model: data.model,
    };
  }

  /**
   * Map backend message to frontend type
   * 
   * @private
   */
  private mapMessage(data: any): AgentMessage {
    return {
      id: data.id,
      role: data.role,
      content: data.content,
      toolCalls: data.tool_calls?.map((tc: any) => this.mapToolCall(tc)),
      toolCallId: data.tool_call_id,
      timestamp: data.timestamp,
    };
  }

  /**
   * Map backend tool call to frontend type
   * 
   * @private
   */
  private mapToolCall(data: any): AgentToolCall {
    return {
      id: data.id,
      name: data.name,
      arguments: data.arguments,
    };
  }

  /**
   * Close all sessions
   * Useful for cleanup on app unmount
   */
  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(
      sessionIds.map(id => this.closeSession(id).catch(console.error))
    );
  }

  /**
   * Get all local sessions
   * 
   * @returns Array of session statuses
   */
  getAllSessions(): AgentStatus[] {
    return Array.from(this.sessions.values());
  }
}

// Export singleton instance
export const agentService = new AgentService();
