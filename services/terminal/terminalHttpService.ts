/**
 * Terminal HTTP Service
 * 
 * Communicates with the backend terminal API over HTTP.
 * This replaces the Tauri IPC approach for better separation of concerns.
 */

const BACKEND_URL = 'http://127.0.0.1:3001/api/v1/terminal';

export interface SessionInfo {
  id: string;
  shell: string;
  cols: number;
  rows: number;
  created_at: string;
  last_activity: string;
}

export interface CreateSessionRequest {
  shell?: string;
  cols?: number;
  rows?: number;
}

class TerminalHttpService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private outputBuffer: Map<string, string[]> = new Map(); // Buffer recent output per session
  private readonly MAX_BUFFER_SIZE = 100; // Keep last 100 lines per session
  
  /**
   * Create a new terminal session
   */
  async createSession(config?: CreateSessionRequest): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create session');
    }
    
    const data = await response.json();
    return data.session_id;
  }
  
  /**
   * Write data to a terminal session
   */
  async write(sessionId: string, data: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to write to session');
    }
  }
  
  /**
   * Read output from a terminal session
   */
  async read(sessionId: string): Promise<string[]> {
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/read`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to read from session');
    }
    
    const data = await response.json();
    return data.output;
  }
  
  /**
   * Close a terminal session
   */
  async closeSession(sessionId: string): Promise<void> {
    this.stopPolling(sessionId);
    
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close session');
    }
  }
  
  /**
   * List all terminal sessions
   */
  async listSessions(): Promise<SessionInfo[]> {
    const response = await fetch(`${BACKEND_URL}/sessions`);
    
    if (!response.ok) {
      throw new Error('Failed to list sessions');
    }
    
    return response.json();
  }
  
  /**
   * Start polling for output and emit events
   */
  startPolling(sessionId: string, intervalMs: number = 100): void {
    if (this.pollingIntervals.has(sessionId)) {
      return;
    }
    
    console.log('[TerminalHttpService] Starting polling for session:', sessionId);
    
    // Initialize buffer for this session
    if (!this.outputBuffer.has(sessionId)) {
      this.outputBuffer.set(sessionId, []);
    }
    
    const interval = setInterval(async () => {
      try {
        const output = await this.read(sessionId);
        if (output.length > 0) {
          console.log('[TerminalHttpService] Received output for session:', sessionId, 'lines:', output.length);
          output.forEach(content => {
            // Strip ANSI escape codes for cleaner display
            const cleanContent = this.stripAnsi(content);
            if (cleanContent.trim()) {
              console.log('[TerminalHttpService] Emitting terminal-data:', { sessionId, data: cleanContent.substring(0, 50) });
              
              // Add to buffer
              const buffer = this.outputBuffer.get(sessionId) || [];
              buffer.push(cleanContent);
              // Keep only last MAX_BUFFER_SIZE lines
              if (buffer.length > this.MAX_BUFFER_SIZE) {
                buffer.shift();
              }
              this.outputBuffer.set(sessionId, buffer);
              
              // Emit event
              window.dispatchEvent(new CustomEvent('terminal-data', {
                detail: { sessionId, data: cleanContent, type: 'stdout' }
              }));
            }
          });
        }
      } catch (error) {
        console.error('[TerminalHttpService] Polling error for session:', sessionId, error);
        // Session might be closed
        this.stopPolling(sessionId);
      }
    }, intervalMs);
    
    this.pollingIntervals.set(sessionId, interval);
  }
  
  /**
   * Get buffered output for a session
   * This allows components to retrieve output that was emitted before they mounted
   */
  getBufferedOutput(sessionId: string): string[] {
    const buffer = this.outputBuffer.get(sessionId) || [];
    console.log('[TerminalHttpService] getBufferedOutput called:', { 
      sessionId, 
      bufferLength: buffer.length,
      allBufferedSessions: Array.from(this.outputBuffer.keys()),
      firstLine: buffer[0]?.substring(0, 50)
    });
    return buffer;
  }
  
  /**
   * Strip ANSI escape codes from terminal output
   */
  private stripAnsi(str: string): string {
    // Remove ANSI escape sequences
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
  }
  
  /**
   * Stop polling for a session
   */
  stopPolling(sessionId: string): void {
    const interval = this.pollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(sessionId);
    }
    // Clean up buffer when polling stops
    this.outputBuffer.delete(sessionId);
  }
  
  /**
   * Check if backend is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:3001/health');
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const terminalHttpService = new TerminalHttpService();
