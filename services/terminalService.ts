import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { isTauriApp, requireTauri } from './tauriDetection';

/**
 * Terminal session information
 */
export interface TerminalSession {
  id: string;
  type: 'shell' | 'codex' | 'skhoot-log';
  isActive: boolean;
}

/**
 * Terminal output from backend
 */
export interface TerminalOutput {
  output_type: 'stdout' | 'stderr' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Session information from backend
 */
export interface SessionInfo {
  session_id: string;
  state: string;
  created_at: number;
  last_activity: number;
}

/**
 * Command history entry
 */
export interface CommandHistory {
  session_id: string;
  command: string;
  args: string[];
  timestamp: number;
  status: string;
}

/**
 * Error event detail
 */
export interface TerminalErrorEvent {
  sessionId: string;
  error: string;
  timestamp: number;
}

/**
 * Terminal Service
 * 
 * Manages terminal sessions with PTY support, providing:
 * - Session lifecycle management (create, write, read, close)
 * - IPC communication with Tauri backend
 * - Event-based output streaming
 * - Error handling and recovery
 * - Session cleanup on unmount
 * 
 * @example
 * ```typescript
 * // Create a new shell session
 * const sessionId = await terminalService.createSession('shell');
 * 
 * // Write to the session
 * await terminalService.writeToSession(sessionId, 'ls -la\n');
 * 
 * // Listen for output
 * window.addEventListener('terminal-data', (event: CustomEvent) => {
 *   console.log(event.detail.data);
 * });
 * 
 * // Close when done
 * await terminalService.closeSession(sessionId);
 * ```
 */
class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private listeners: Map<string, UnlistenFn> = new Map();
  private outputPollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly POLLING_INTERVAL_MS = 100;

  /**
   * Create a new terminal session
   * 
   * @param type - Type of terminal session to create
   * @param cols - Number of columns (default: 80)
   * @param rows - Number of rows (default: 24)
   * @returns Session ID
   * @throws Error if session creation fails
   */
  async createSession(
    type: 'shell' | 'codex' | 'skhoot-log',
    cols: number = 80,
    rows: number = 24
  ): Promise<string> {
    console.log('[TerminalService] createSession called with:', { type, cols, rows });
    
    try {
      // Determine shell based on type
      const shell = type === 'codex' ? 'codex' : undefined;
      console.log('[TerminalService] Shell command:', shell || 'default system shell');
      
      // Create terminal session via Tauri
      console.log('[TerminalService] Invoking create_terminal_session with params:', { shell, cols, rows });
      const sessionId = await invoke<string>('create_terminal_session', {
        shell,
        cols,
        rows,
      });
      console.log('[TerminalService] Session created with ID:', sessionId);

      // Store session info
      this.sessions.set(sessionId, {
        id: sessionId,
        type,
        isActive: true,
      });
      console.log('[TerminalService] Session stored locally');

      // Reset reconnect attempts
      this.reconnectAttempts.set(sessionId, 0);

      // Start polling for output
      this.startOutputPolling(sessionId);
      console.log('[TerminalService] Output polling started');

      // Emit session created event
      this.emitEvent('terminal-session-created', { sessionId, type });

      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TerminalService] Failed to create terminal session:', errorMessage);
      console.error('[TerminalService] Full error:', error);
      this.emitErrorEvent('create', errorMessage);
      throw new Error(`Failed to create terminal session: ${errorMessage}`);
    }
  }

  /**
   * Write data to a terminal session
   * 
   * @param sessionId - Session ID to write to
   * @param data - Data to write (typically includes \n for commands)
   * @throws Error if write fails
   */
  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await invoke('write_to_terminal', {
        sessionId,
        data,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to write to terminal:', errorMessage);
      this.emitErrorEvent(sessionId, errorMessage);
      
      // Attempt recovery
      await this.attemptRecovery(sessionId);
      throw new Error(`Failed to write to terminal: ${errorMessage}`);
    }
  }

  /**
   * Read output from a terminal session
   * 
   * @param sessionId - Session ID to read from
   * @returns Array of terminal outputs
   * @throws Error if read fails
   */
  async readFromSession(sessionId: string): Promise<TerminalOutput[]> {
    try {
      const outputs = await invoke<TerminalOutput[]>('read_from_terminal', {
        sessionId,
      });
      return outputs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't log errors for closed sessions (expected behavior)
      if (!errorMessage.includes('not found') && !errorMessage.includes('closed')) {
        console.error('Failed to read from terminal:', errorMessage);
        this.emitErrorEvent(sessionId, errorMessage);
      }
      
      return [];
    }
  }

  /**
   * Resize a terminal session
   * 
   * @param sessionId - Session ID to resize
   * @param cols - New number of columns
   * @param rows - New number of rows
   * @throws Error if resize fails
   */
  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await invoke('resize_terminal', {
        sessionId,
        cols,
        rows,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to resize terminal:', errorMessage);
      this.emitErrorEvent(sessionId, errorMessage);
      throw new Error(`Failed to resize terminal: ${errorMessage}`);
    }
  }

  /**
   * Close a terminal session
   * 
   * @param sessionId - Session ID to close
   * @throws Error if close fails
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      // Stop polling
      this.stopOutputPolling(sessionId);

      // Remove listener
      const unlisten = this.listeners.get(sessionId);
      if (unlisten) {
        unlisten();
        this.listeners.delete(sessionId);
      }

      // Close session via Tauri
      await invoke('close_terminal_session', {
        sessionId,
      });

      // Remove from local storage
      this.sessions.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);

      // Emit session closed event
      this.emitEvent('terminal-session-closed', { sessionId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to close terminal session:', errorMessage);
      
      // Clean up local state even if backend close fails
      this.stopOutputPolling(sessionId);
      this.sessions.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);
      
      throw new Error(`Failed to close terminal session: ${errorMessage}`);
    }
  }

  /**
   * List all active terminal sessions from backend
   * 
   * @returns Array of session information
   */
  async listSessions(): Promise<SessionInfo[]> {
    try {
      const sessions = await invoke<SessionInfo[]>('list_terminal_sessions');
      return sessions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to list terminal sessions:', errorMessage);
      return [];
    }
  }

  /**
   * Get command history for a session
   * 
   * @param sessionId - Session ID to get history for
   * @returns Array of command history entries
   */
  async getSessionHistory(sessionId: string): Promise<CommandHistory[]> {
    try {
      const history = await invoke<CommandHistory[]>('get_session_history', {
        sessionId,
      });
      return history;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to get session history:', errorMessage);
      return [];
    }
  }

  /**
   * Get session state from backend
   * 
   * @param sessionId - Session ID to get state for
   * @returns Session state string
   */
  async getSessionState(sessionId: string): Promise<string> {
    try {
      const state = await invoke<string>('get_session_state', {
        sessionId,
      });
      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to get session state:', errorMessage);
      return 'Unknown';
    }
  }

  /**
   * Start polling for terminal output
   * Polls every 100ms and emits 'terminal-data' events
   * 
   * @private
   */
  private startOutputPolling(sessionId: string): void {
    // Clear any existing interval
    this.stopOutputPolling(sessionId);

    // Poll every 100ms for new output
    const interval = setInterval(async () => {
      try {
        const outputs = await this.readFromSession(sessionId);
        if (outputs.length > 0) {
          // Emit custom event for each output
          outputs.forEach(output => {
            this.emitEvent('terminal-data', {
              sessionId,
              data: output.content,
              type: output.output_type,
              timestamp: output.timestamp,
            });
          });
        }
      } catch (error) {
        // Session might be closed, stop polling
        this.stopOutputPolling(sessionId);
      }
    }, this.POLLING_INTERVAL_MS);

    this.outputPollingIntervals.set(sessionId, interval);
  }

  /**
   * Stop polling for terminal output
   * 
   * @private
   */
  private stopOutputPolling(sessionId: string): void {
    const interval = this.outputPollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.outputPollingIntervals.delete(sessionId);
    }
  }

  /**
   * Attempt to recover a failed session
   * 
   * @private
   */
  private async attemptRecovery(sessionId: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnect attempts reached for session ${sessionId}`);
      this.emitErrorEvent(sessionId, 'Max reconnect attempts reached');
      
      // Mark session as inactive
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isActive = false;
      }
      return;
    }

    this.reconnectAttempts.set(sessionId, attempts + 1);
    
    // Try to check if session still exists
    try {
      const state = await this.getSessionState(sessionId);
      if (state !== 'Unknown') {
        // Session still exists, reset attempts
        this.reconnectAttempts.set(sessionId, 0);
      }
    } catch (error) {
      console.error(`Recovery attempt ${attempts + 1} failed for session ${sessionId}`);
    }
  }

  /**
   * Emit a custom event
   * 
   * @private
   */
  private emitEvent(eventName: string, detail: any): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * Emit an error event
   * 
   * @private
   */
  private emitErrorEvent(sessionId: string, error: string): void {
    this.emitEvent('terminal-error', {
      sessionId,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Get local session info
   * 
   * @param sessionId - Session ID to get
   * @returns Session info or undefined if not found
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all local sessions
   * 
   * @returns Array of all local sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
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
   * Check if service is healthy
   * 
   * @returns True if at least one session is active
   */
  isHealthy(): boolean {
    return Array.from(this.sessions.values()).some(s => s.isActive);
  }
}

// Export singleton instance
export const terminalService = new TerminalService();
