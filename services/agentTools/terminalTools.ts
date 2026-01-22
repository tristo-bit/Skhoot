/**
 * Terminal Tools for AI Agent Integration
 * 
 * Provides AI agents with programmatic terminal control capabilities:
 * - create_terminal: Create new terminal sessions
 * - execute_command: Execute commands in specific sessions
 * - read_output: Read output from terminal sessions
 * - list_terminals: List all active terminal sessions
 * - inspect_terminal: Get detailed state of a terminal session
 * 
 * These tools enable AI agents to interact with the system through terminal
 * sessions, execute commands, and receive real-time output.
 */

import { terminalService, TerminalSession, TerminalOutput, SessionInfo, CommandHistory } from '../terminal/terminalService';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Tool definition for AI agent
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required: string[];
  };
}

/**
 * Parameter definition for tool
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  default?: any;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  sessionId: string;
  workspaceRoot?: string;
  createdBy: 'user' | 'ai';
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Terminal info for AI
 */
export interface TerminalInfo {
  sessionId: string;
  status: 'running' | 'completed' | 'error';
  createdBy: 'user' | 'ai';
  workspaceRoot: string;
  commandCount: number;
  lastActivity: number;
}

/**
 * Terminal state for inspection
 */
export interface TerminalState {
  sessionId: string;
  status: string;
  commandHistory: string[];
  currentOutput: string[];
  workspaceRoot: string;
  createdAt: number;
  lastActivity: number;
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definitions for AI agent
 */
export const terminalToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_terminal',
    description: 'Create a new terminal session for executing commands. Returns a session ID that can be used to execute commands and read output. NOTE: You already have a persistent terminal for this conversation - only create a new one if you need a separate environment. Your terminal persists across messages, so you can run multiple commands and maintain state.',
    parameters: {
      type: 'object',
      properties: {
        workspaceRoot: {
          type: 'string',
          description: 'Optional workspace root directory for the terminal session. Commands will execute relative to this directory.',
        },
        type: {
          type: 'string',
          description: 'Type of terminal to create',
          enum: ['shell', 'codex'],
          default: 'shell',
        },
      },
      required: [],
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a command in your terminal session. The command runs in your persistent AI terminal that the user can also see. Output is automatically displayed - no need to call read_output or describe what happened. Just execute and move on. Your terminal maintains state across commands (environment variables, current directory, etc.).',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID of the terminal (optional - uses your conversation terminal if not provided)',
        },
        command: {
          type: 'string',
          description: 'The command to execute (will automatically append newline)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_output',
    description: 'Read output from a terminal session. Returns all output since the last read. NOTE: This is rarely needed - output is automatically visible in the terminal panel. Only use this if you need to programmatically process the output (e.g., parse JSON, check for errors). For simple commands like ls, cd, etc., just execute and trust the output is visible.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID of the terminal to read from',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'list_terminals',
    description: 'List all active terminal sessions with their current states. Useful for discovering available terminals.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'inspect_terminal',
    description: 'Get detailed state information about a specific terminal session, including command history and current output.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID of the terminal to inspect',
        },
      },
      required: ['sessionId'],
    },
  },
];

// ============================================================================
// Tool Context Management
// ============================================================================

/**
 * Store for terminal contexts (tracks which terminals were created by AI)
 */
class TerminalContextStore {
  private contexts: Map<string, ToolContext> = new Map();
  private agentSessionTerminals: Map<string, string> = new Map(); // agentSessionId -> terminalSessionId

  /**
   * Register a terminal context
   */
  register(sessionId: string, context: ToolContext): void {
    this.contexts.set(sessionId, context);
    // Also track by agent session for quick lookup
    if (context.createdBy === 'ai') {
      this.agentSessionTerminals.set(context.sessionId, sessionId);
    }
  }

  /**
   * Get terminal context
   */
  get(sessionId: string): ToolContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Get terminal session ID for an agent session
   */
  getTerminalForAgent(agentSessionId: string): string | undefined {
    return this.agentSessionTerminals.get(agentSessionId);
  }

  /**
   * Remove terminal context
   */
  remove(sessionId: string): void {
    const context = this.contexts.get(sessionId);
    if (context) {
      this.agentSessionTerminals.delete(context.sessionId);
    }
    this.contexts.delete(sessionId);
  }

  /**
   * Check if terminal was created by AI
   */
  isAICreated(sessionId: string): boolean {
    const context = this.contexts.get(sessionId);
    return context?.createdBy === 'ai';
  }

  /**
   * Get all AI-created terminals
   */
  getAITerminals(): string[] {
    return Array.from(this.contexts.entries())
      .filter(([_, ctx]) => ctx.createdBy === 'ai')
      .map(([sessionId]) => sessionId);
  }
}

export const terminalContextStore = new TerminalContextStore();

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Create a new terminal session
 * Note: In most cases, the conversation already has a terminal session.
 * This tool should primarily be used if a new terminal is explicitly needed.
 */
export async function handleCreateTerminal(
  args: { workspaceRoot?: string; type?: 'shell' | 'codex' },
  agentSessionId: string
): Promise<ToolResult> {
  try {
    // Check if this agent session already has a terminal
    const existingTerminal = terminalContextStore.getTerminalForAgent(agentSessionId);
    if (existingTerminal) {
      // Verify the terminal still exists in terminalService
      const session = terminalService.getSession(existingTerminal);
      if (session) {
        console.log('[handleCreateTerminal] Reusing existing terminal:', existingTerminal);
        return {
          success: true,
          data: {
            sessionId: existingTerminal,
            workspaceRoot: args.workspaceRoot || 'current directory',
            message: 'Using existing terminal session for this conversation',
          },
          metadata: {
            createdBy: 'ai',
            agentSessionId,
            reused: true,
          },
        };
      } else {
        // Terminal was closed, remove from context store
        console.log('[handleCreateTerminal] Existing terminal was closed, creating new one');
        terminalContextStore.remove(existingTerminal);
      }
    }
    
    const type = args.type || 'shell';
    const sessionId = await terminalService.createSession(type);

    // Register context
    terminalContextStore.register(sessionId, {
      sessionId: agentSessionId,
      workspaceRoot: args.workspaceRoot,
      createdBy: 'ai',
    });

    // Emit event to notify UI that AI created a terminal
    window.dispatchEvent(new CustomEvent('ai-terminal-created', {
      detail: {
        sessionId,
        type,
        createdBy: 'ai',
        workspaceRoot: args.workspaceRoot,
        agentSessionId,
        autoOpen: true, // Auto-open for explicitly created terminals
      }
    }));

    // If workspace root is specified, cd to it
    if (args.workspaceRoot) {
      await terminalService.writeToSession(sessionId, `cd "${args.workspaceRoot}"\n`);
      // Wait a bit for the cd command to execute
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: true,
      data: {
        sessionId,
        workspaceRoot: args.workspaceRoot || 'current directory',
        message: 'Terminal session created successfully',
      },
      metadata: {
        createdBy: 'ai',
        agentSessionId,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create terminal: ${errorMessage}`,
      metadata: {
        errorType: 'terminal_creation_failed',
        retryable: true,
      },
    };
  }
}

/**
 * Execute a command in a terminal session
 * If no sessionId is provided, uses the conversation's default terminal
 */
export async function handleExecuteCommand(
  args: { sessionId?: string; session_id?: string; command: string },
  agentSessionId?: string
): Promise<ToolResult> {
  try {
    // Support both camelCase and snake_case
    let sessionId = args.sessionId || args.session_id;
    const { command } = args;

    // If no sessionId provided, try to use the conversation's terminal
    if (!sessionId && agentSessionId) {
      sessionId = terminalContextStore.getTerminalForAgent(agentSessionId);
      if (!sessionId) {
        return {
          success: false,
          error: 'No terminal session found for this conversation. Please create a terminal first using create_terminal.',
          metadata: {
            errorType: 'no_default_terminal',
            retryable: false,
          },
        };
      }
    }

    if (!sessionId) {
      return {
        success: false,
        error: 'Missing sessionId parameter',
        metadata: {
          errorType: 'missing_parameter',
          retryable: false,
        },
      };
    }

    // Validate session exists
    const session = terminalService.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Terminal session ${sessionId} not found. Use list_terminals to see available sessions.`,
        metadata: {
          errorType: 'session_not_found',
          retryable: false,
          availableSessions: terminalService.getAllSessions().map(s => s.id),
        },
      };
    }

    // Ensure command ends with newline
    const commandWithNewline = command.endsWith('\n') ? command : `${command}\n`;

    // Execute command
    await terminalService.writeToSession(sessionId, commandWithNewline);

    // Emit the command to the UI so it shows in the terminal
    window.dispatchEvent(new CustomEvent('terminal-data', {
      detail: {
        sessionId,
        data: `$ ${command}\n`,
        type: 'input',
      }
    }));

    // Give the command a moment to start executing
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      success: true,
      data: {
        sessionId,
        command: command.trim(),
        message: 'Command executed successfully. Output is visible in the terminal panel.',
      },
      metadata: {
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide structured error for AI retry
    let errorType = 'command_execution_failed';
    let retryable = true;
    
    if (errorMessage.includes('permission denied')) {
      errorType = 'permission_denied';
      retryable = false;
    } else if (errorMessage.includes('not found')) {
      errorType = 'session_not_found';
      retryable = false;
    }

    return {
      success: false,
      error: `Failed to execute command: ${errorMessage}`,
      metadata: {
        errorType,
        retryable,
        command: args.command,
      },
    };
  }
}

/**
 * Read output from a terminal session
 */
export async function handleReadOutput(
  args: { sessionId?: string; session_id?: string }
): Promise<ToolResult> {
  try {
    // Support both camelCase and snake_case
    const sessionId = args.sessionId || args.session_id;

    if (!sessionId) {
      return {
        success: false,
        error: 'Missing sessionId parameter',
        metadata: {
          errorType: 'missing_parameter',
          retryable: false,
        },
      };
    }

    // Validate session exists
    const session = terminalService.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Terminal session ${sessionId} not found. Use list_terminals to see available sessions.`,
        metadata: {
          errorType: 'session_not_found',
          retryable: false,
        },
      };
    }

    // Read output
    const outputs = await terminalService.readFromSession(sessionId);

    // Format output for AI
    const formattedOutput = outputs.map(o => ({
      type: o.output_type,
      content: o.content,
      timestamp: o.timestamp,
    }));

    const combinedOutput = outputs.map(o => o.content).join('');

    return {
      success: true,
      data: {
        sessionId,
        output: combinedOutput || '(No new output - output is visible in terminal panel)',
        outputs: formattedOutput,
        status: session.isActive ? 'running' : 'completed',
      },
      metadata: {
        outputCount: outputs.length,
        timestamp: Date.now(),
        note: outputs.length === 0 ? 'Output is automatically displayed in the terminal panel. No need to keep checking.' : undefined,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to read output: ${errorMessage}`,
      metadata: {
        errorType: 'read_failed',
        retryable: true,
      },
    };
  }
}

/**
 * List all active terminal sessions
 */
export async function handleListTerminals(): Promise<ToolResult> {
  try {
    // Get sessions from backend
    const backendSessions = await terminalService.listSessions();
    
    // Get local sessions
    const localSessions = terminalService.getAllSessions();

    // Combine and format for AI
    const terminals: TerminalInfo[] = localSessions.map(session => {
      const backendInfo = backendSessions.find(s => s.session_id === session.id);
      const context = terminalContextStore.get(session.id);

      return {
        sessionId: session.id,
        status: session.isActive ? 'running' : 'completed',
        createdBy: context?.createdBy || 'user',
        workspaceRoot: context?.workspaceRoot || 'unknown',
        commandCount: 0, // Will be populated from history if available
        lastActivity: backendInfo?.last_activity || Date.now(),
      };
    });

    return {
      success: true,
      data: {
        terminals,
        count: terminals.length,
      },
      metadata: {
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to list terminals: ${errorMessage}`,
      metadata: {
        errorType: 'list_failed',
        retryable: true,
      },
    };
  }
}

/**
 * Inspect a terminal session
 */
export async function handleInspectTerminal(
  args: { sessionId?: string; session_id?: string }
): Promise<ToolResult> {
  try {
    // Support both camelCase and snake_case
    const sessionId = args.sessionId || args.session_id;

    if (!sessionId) {
      return {
        success: false,
        error: 'Missing sessionId parameter',
        metadata: {
          errorType: 'missing_parameter',
          retryable: false,
        },
      };
    }

    // Validate session exists
    const session = terminalService.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Terminal session ${sessionId} not found. Use list_terminals to see available sessions.`,
        metadata: {
          errorType: 'session_not_found',
          retryable: false,
        },
      };
    }

    // Get session state
    const state = await terminalService.getSessionState(sessionId);
    
    // Get command history
    const history = await terminalService.getSessionHistory(sessionId);
    
    // Get current output
    const outputs = await terminalService.readFromSession(sessionId);
    
    // Get context
    const context = terminalContextStore.get(sessionId);

    const terminalState: TerminalState = {
      sessionId,
      status: state,
      commandHistory: history.map(h => `${h.command} ${h.args.join(' ')}`),
      currentOutput: outputs.map(o => o.content),
      workspaceRoot: context?.workspaceRoot || 'unknown',
      createdAt: 0, // Not available from current API
      lastActivity: Date.now(),
    };

    return {
      success: true,
      data: terminalState,
      metadata: {
        createdBy: context?.createdBy || 'user',
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to inspect terminal: ${errorMessage}`,
      metadata: {
        errorType: 'inspect_failed',
        retryable: true,
      },
    };
  }
}

// ============================================================================
// Tool Router
// ============================================================================

/**
 * Route tool calls to appropriate handlers
 */
export async function executeTerminalTool(
  toolName: string,
  args: Record<string, any>,
  agentSessionId: string
): Promise<ToolResult> {
  switch (toolName) {
    case 'create_terminal':
      return handleCreateTerminal(args, agentSessionId);
    
    case 'execute_command':
      return handleExecuteCommand(args, agentSessionId);
    
    case 'read_output':
      return handleReadOutput(args);
    
    case 'list_terminals':
      return handleListTerminals();
    
    case 'inspect_terminal':
      return handleInspectTerminal(args);
    
    default:
      return {
        success: false,
        error: `Unknown terminal tool: ${toolName}`,
        metadata: {
          errorType: 'unknown_tool',
          retryable: false,
          availableTools: terminalToolDefinitions.map(t => t.name),
        },
      };
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up AI-created terminals when agent session closes
 */
export async function cleanupAITerminals(agentSessionId: string): Promise<void> {
  const aiTerminals = terminalContextStore.getAITerminals();
  
  for (const sessionId of aiTerminals) {
    const context = terminalContextStore.get(sessionId);
    if (context?.sessionId === agentSessionId) {
      try {
        await terminalService.closeSession(sessionId);
        terminalContextStore.remove(sessionId);
      } catch (error) {
        console.error(`Failed to cleanup terminal ${sessionId}:`, error);
      }
    }
  }
}
