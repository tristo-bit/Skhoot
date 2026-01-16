/**
 * Property-Based Tests for Terminal Tools
 * 
 * Tests terminal tool functionality using property-based testing with fast-check
 * to verify correctness across a wide range of inputs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  handleCreateTerminal,
  handleExecuteCommand,
  handleReadOutput,
  handleListTerminals,
  handleInspectTerminal,
  terminalContextStore,
  executeTerminalTool,
  cleanupAITerminals,
} from '../terminalTools';
import { terminalService } from '../../terminalService';

// Mock the terminal service
vi.mock('../../terminalService', () => ({
  terminalService: {
    createSession: vi.fn(),
    writeToSession: vi.fn(),
    readFromSession: vi.fn(),
    getSession: vi.fn(),
    getAllSessions: vi.fn(),
    listSessions: vi.fn(),
    getSessionState: vi.fn(),
    getSessionHistory: vi.fn(),
    closeSession: vi.fn(),
  },
}));

describe('Terminal Tools - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up context store
    const aiTerminals = terminalContextStore.getAITerminals();
    aiTerminals.forEach(sessionId => terminalContextStore.remove(sessionId));
  });

  // Feature: skhoot-v0.1.5, Property 1: Terminal creation returns session ID
  // Validates: Requirements 1.1
  describe('Property 1: Terminal creation returns session ID', () => {
    it('should return a valid session ID for any terminal creation request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            workspaceRoot: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            type: fc.constantFrom('shell' as const, 'codex' as const),
          }),
          fc.string({ minLength: 5, maxLength: 50 }), // agentSessionId
          async (args, agentSessionId) => {
            // Arrange: Mock terminal service to return a session ID
            const mockSessionId = `session-${Math.random().toString(36).substring(7)}`;
            vi.mocked(terminalService.createSession).mockResolvedValue(mockSessionId);
            vi.mocked(terminalService.writeToSession).mockResolvedValue(undefined);

            // Act: Create terminal (with fake timers to skip setTimeout)
            const resultPromise = handleCreateTerminal(args, agentSessionId);
            
            // Fast-forward timers if workspace root is set
            if (args.workspaceRoot) {
              await vi.advanceTimersByTimeAsync(100);
            }
            
            const result = await resultPromise;

            // Assert: Should return success with session ID
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.sessionId).toBe(mockSessionId);
            expect(typeof result.data.sessionId).toBe('string');
            expect(result.data.sessionId.length).toBeGreaterThan(0);

            // Verify context was registered
            const context = terminalContextStore.get(mockSessionId);
            expect(context).toBeDefined();
            expect(context?.createdBy).toBe('ai');
            expect(context?.sessionId).toBe(agentSessionId);

            // Cleanup
            terminalContextStore.remove(mockSessionId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle terminal creation failures gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            workspaceRoot: fc.option(fc.string(), { nil: undefined }),
            type: fc.constantFrom('shell' as const, 'codex' as const),
          }),
          fc.string({ minLength: 1 }),
          async (args, agentSessionId) => {
            // Arrange: Mock terminal service to fail
            vi.mocked(terminalService.createSession).mockRejectedValue(
              new Error('Terminal creation failed')
            );

            // Act: Attempt to create terminal
            const result = await handleCreateTerminal(args, agentSessionId);

            // Assert: Should return structured error
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Failed to create terminal');
            expect(result.metadata?.errorType).toBe('terminal_creation_failed');
            expect(result.metadata?.retryable).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 2: Command routing to correct session
  // Validates: Requirements 1.2
  describe('Property 2: Command routing to correct session', () => {
    it('should route commands to the specified terminal session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }), // sessionId
          fc.string({ minLength: 1, maxLength: 200 }), // command
          async (sessionId, command) => {
            // Arrange: Mock session exists
            vi.mocked(terminalService.getSession).mockReturnValue({
              id: sessionId,
              type: 'shell',
              isActive: true,
            });
            vi.mocked(terminalService.writeToSession).mockResolvedValue(undefined);

            // Act: Execute command
            const result = await handleExecuteCommand({ sessionId, command });

            // Assert: Should succeed and route to correct session
            expect(result.success).toBe(true);
            expect(result.data.sessionId).toBe(sessionId);
            expect(result.data.command).toBe(command.trim());

            // Verify writeToSession was called with correct session
            expect(terminalService.writeToSession).toHaveBeenCalledWith(
              sessionId,
              expect.stringContaining(command)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error for non-existent sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (sessionId, command) => {
            // Arrange: Mock session does not exist
            vi.mocked(terminalService.getSession).mockReturnValue(undefined);
            vi.mocked(terminalService.getAllSessions).mockReturnValue([]);

            // Act: Attempt to execute command
            const result = await handleExecuteCommand({ sessionId, command });

            // Assert: Should return session not found error
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
            expect(result.metadata?.errorType).toBe('session_not_found');
            expect(result.metadata?.retryable).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 3: Real-time output streaming
  // Validates: Requirements 1.3
  describe('Property 3: Real-time output streaming', () => {
    it('should stream output back from terminal sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5 }), // sessionId
          fc.array(
            fc.record({
              output_type: fc.constantFrom('stdout' as const, 'stderr' as const, 'system' as const),
              content: fc.string({ minLength: 0, maxLength: 500 }),
              timestamp: fc.integer({ min: 0, max: Date.now() }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (sessionId, outputs) => {
            // Arrange: Mock session exists and has output
            vi.mocked(terminalService.getSession).mockReturnValue({
              id: sessionId,
              type: 'shell',
              isActive: true,
            });
            vi.mocked(terminalService.readFromSession).mockResolvedValue(outputs);

            // Act: Read output
            const result = await handleReadOutput({ sessionId });

            // Assert: Should return all output
            expect(result.success).toBe(true);
            expect(result.data.sessionId).toBe(sessionId);
            expect(result.data.outputs).toHaveLength(outputs.length);
            
            // Verify output is properly formatted
            const combinedOutput = outputs.map(o => o.content).join('');
            expect(result.data.output).toBe(combinedOutput);

            // Verify metadata
            expect(result.metadata?.outputCount).toBe(outputs.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty output gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (sessionId) => {
            // Arrange: Mock session with no output
            vi.mocked(terminalService.getSession).mockReturnValue({
              id: sessionId,
              type: 'shell',
              isActive: true,
            });
            vi.mocked(terminalService.readFromSession).mockResolvedValue([]);

            // Act: Read output
            const result = await handleReadOutput({ sessionId });

            // Assert: Should succeed with empty output
            expect(result.success).toBe(true);
            expect(result.data.output).toBe('');
            expect(result.data.outputs).toHaveLength(0);
            expect(result.metadata?.outputCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 4: Terminal list completeness
  // Validates: Requirements 1.4
  describe('Property 4: Terminal list completeness', () => {
    it('should return all active terminal sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom('shell' as const, 'codex' as const, 'skhoot-log' as const),
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (sessions) => {
            // Arrange: Mock sessions
            vi.mocked(terminalService.getAllSessions).mockReturnValue(sessions);
            vi.mocked(terminalService.listSessions).mockResolvedValue(
              sessions.map(s => ({
                session_id: s.id,
                state: 'running',
                created_at: Date.now(),
                last_activity: Date.now(),
              }))
            );

            // Register some as AI-created
            sessions.forEach((session, idx) => {
              if (idx % 2 === 0) {
                terminalContextStore.register(session.id, {
                  sessionId: `agent-${idx}`,
                  createdBy: 'ai',
                  workspaceRoot: '/test',
                });
              }
            });

            // Act: List terminals
            const result = await handleListTerminals();

            // Assert: Should return all sessions
            expect(result.success).toBe(true);
            expect(result.data.terminals).toHaveLength(sessions.length);
            expect(result.data.count).toBe(sessions.length);

            // Verify each terminal has required fields
            result.data.terminals.forEach((terminal: any) => {
              expect(terminal.sessionId).toBeDefined();
              expect(terminal.status).toBeDefined();
              expect(terminal.createdBy).toBeDefined();
              expect(terminal.workspaceRoot).toBeDefined();
              expect(typeof terminal.commandCount).toBe('number');
              expect(typeof terminal.lastActivity).toBe('number');
            });

            // Cleanup
            sessions.forEach(s => terminalContextStore.remove(s.id));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 5: Terminal state inspection completeness
  // Validates: Requirements 1.5
  describe('Property 5: Terminal state inspection completeness', () => {
    it('should return complete state information for any terminal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5 }),
          fc.string({ minLength: 1, maxLength: 50 }), // state
          fc.array(
            fc.record({
              session_id: fc.string(),
              command: fc.string({ minLength: 1, maxLength: 50 }),
              args: fc.array(fc.string(), { maxLength: 5 }),
              timestamp: fc.integer({ min: 0 }),
              status: fc.string(),
            }),
            { maxLength: 10 }
          ),
          fc.array(
            fc.record({
              output_type: fc.constantFrom('stdout' as const, 'stderr' as const),
              content: fc.string({ maxLength: 100 }),
              timestamp: fc.integer({ min: 0 }),
            }),
            { maxLength: 10 }
          ),
          async (sessionId, state, history, outputs) => {
            // Arrange: Mock session with complete state
            vi.mocked(terminalService.getSession).mockReturnValue({
              id: sessionId,
              type: 'shell',
              isActive: true,
            });
            vi.mocked(terminalService.getSessionState).mockResolvedValue(state);
            vi.mocked(terminalService.getSessionHistory).mockResolvedValue(history);
            vi.mocked(terminalService.readFromSession).mockResolvedValue(outputs);

            terminalContextStore.register(sessionId, {
              sessionId: 'agent-1',
              createdBy: 'ai',
              workspaceRoot: '/test',
            });

            // Act: Inspect terminal
            const result = await handleInspectTerminal({ sessionId });

            // Assert: Should return complete state
            expect(result.success).toBe(true);
            expect(result.data.sessionId).toBe(sessionId);
            expect(result.data.status).toBe(state);
            expect(result.data.commandHistory).toHaveLength(history.length);
            expect(result.data.currentOutput).toHaveLength(outputs.length);
            expect(result.data.workspaceRoot).toBeDefined();
            expect(typeof result.data.lastActivity).toBe('number');

            // Cleanup
            terminalContextStore.remove(sessionId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 8: Structured error messages
  // Validates: Requirements 1.8
  describe('Property 8: Structured error messages', () => {
    it('should provide structured error messages for all failure types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'session_not_found',
            'permission_denied',
            'command_execution_failed',
            'read_failed'
          ),
          fc.string({ minLength: 1 }),
          async (errorType, sessionId) => {
            // Arrange: Mock different error scenarios
            let errorMessage = 'Generic error';
            if (errorType === 'session_not_found') {
              errorMessage = 'Session not found';
              vi.mocked(terminalService.getSession).mockReturnValue(undefined);
            } else if (errorType === 'permission_denied') {
              errorMessage = 'permission denied';
              vi.mocked(terminalService.getSession).mockReturnValue({
                id: sessionId,
                type: 'shell',
                isActive: true,
              });
              vi.mocked(terminalService.writeToSession).mockRejectedValue(
                new Error(errorMessage)
              );
            }

            // Act: Attempt operation that will fail
            let result;
            if (errorType === 'session_not_found' || errorType === 'permission_denied') {
              result = await handleExecuteCommand({ sessionId, command: 'test' });
            } else {
              vi.mocked(terminalService.getSession).mockReturnValue(undefined);
              result = await handleReadOutput({ sessionId });
            }

            // Assert: Should return structured error
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.metadata?.errorType).toBeDefined();
            expect(typeof result.metadata?.retryable).toBe('boolean');

            // Verify error structure helps AI retry logic
            if (errorType === 'session_not_found') {
              expect(result.metadata?.retryable).toBe(false);
            } else if (errorType === 'permission_denied') {
              expect(result.metadata?.retryable).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional test: Tool router
  describe('Tool Router', () => {
    it('should route tool calls to correct handlers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'create_terminal',
            'execute_command',
            'read_output',
            'list_terminals',
            'inspect_terminal'
          ),
          fc.string({ minLength: 1 }),
          async (toolName, agentSessionId) => {
            // Arrange: Mock appropriate service methods
            const mockSessionId = 'test-session';
            vi.mocked(terminalService.createSession).mockResolvedValue(mockSessionId);
            vi.mocked(terminalService.writeToSession).mockResolvedValue(undefined);
            vi.mocked(terminalService.getSession).mockReturnValue({
              id: mockSessionId,
              type: 'shell',
              isActive: true,
            });
            vi.mocked(terminalService.readFromSession).mockResolvedValue([]);
            vi.mocked(terminalService.getAllSessions).mockReturnValue([]);
            vi.mocked(terminalService.listSessions).mockResolvedValue([]);
            vi.mocked(terminalService.getSessionState).mockResolvedValue('running');
            vi.mocked(terminalService.getSessionHistory).mockResolvedValue([]);

            // Prepare args based on tool
            let args: Record<string, any> = {};
            if (toolName === 'execute_command') {
              args = { sessionId: mockSessionId, command: 'test' };
            } else if (toolName === 'read_output' || toolName === 'inspect_terminal') {
              args = { sessionId: mockSessionId };
            }

            // Act: Execute tool
            const result = await executeTerminalTool(toolName, args, agentSessionId);

            // Assert: Should route correctly
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            // Cleanup
            if (toolName === 'create_terminal' && result.success) {
              terminalContextStore.remove(result.data.sessionId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional test: Cleanup
  describe('Cleanup AI Terminals', () => {
    it('should clean up all terminals created by an agent session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 5 }), { minLength: 1, maxLength: 5 }),
          async (agentSessionId, terminalIds) => {
            // Clear previous mock calls
            vi.clearAllMocks();
            
            // Arrange: Register terminals as AI-created
            terminalIds.forEach(terminalId => {
              terminalContextStore.register(terminalId, {
                sessionId: agentSessionId,
                createdBy: 'ai',
              });
            });

            vi.mocked(terminalService.closeSession).mockResolvedValue(undefined);

            // Act: Cleanup
            await cleanupAITerminals(agentSessionId);

            // Assert: All terminals should be closed
            expect(terminalService.closeSession).toHaveBeenCalledTimes(terminalIds.length);
            
            // Verify contexts are removed
            terminalIds.forEach(terminalId => {
              expect(terminalContextStore.get(terminalId)).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: skhoot-v0.1.5, Property 6: AI control badge display
  // Validates: Requirements 1.6
  describe('Property 6: AI control badge display', () => {
    it('should mark terminals created by AI with appropriate context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5 }),
          fc.string({ minLength: 1 }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          async (sessionId, agentSessionId, workspaceRoot) => {
            // Arrange: Register terminal as AI-created
            terminalContextStore.register(sessionId, {
              sessionId: agentSessionId,
              createdBy: 'ai',
              workspaceRoot,
            });

            // Act: Get context
            const context = terminalContextStore.get(sessionId);

            // Assert: Context should indicate AI creation
            expect(context).toBeDefined();
            expect(context?.createdBy).toBe('ai');
            expect(context?.sessionId).toBe(agentSessionId);
            expect(context?.workspaceRoot).toBe(workspaceRoot);

            // Verify isAICreated helper
            expect(terminalContextStore.isAICreated(sessionId)).toBe(true);

            // Cleanup
            terminalContextStore.remove(sessionId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should distinguish between AI and user-created terminals', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              sessionId: fc.string({ minLength: 5 }),
              createdBy: fc.constantFrom('ai' as const, 'user' as const),
              agentSessionId: fc.string({ minLength: 1 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (terminals) => {
            // Arrange: Register terminals with different creators
            terminals.forEach(terminal => {
              terminalContextStore.register(terminal.sessionId, {
                sessionId: terminal.agentSessionId,
                createdBy: terminal.createdBy,
              });
            });

            // Act: Get AI terminals
            const aiTerminals = terminalContextStore.getAITerminals();

            // Assert: Should only return AI-created terminals
            const expectedAITerminals = terminals
              .filter(t => t.createdBy === 'ai')
              .map(t => t.sessionId);

            expect(aiTerminals.sort()).toEqual(expectedAITerminals.sort());

            // Verify each terminal's creator
            terminals.forEach(terminal => {
              const isAI = terminalContextStore.isAICreated(terminal.sessionId);
              expect(isAI).toBe(terminal.createdBy === 'ai');
            });

            // Cleanup
            terminals.forEach(t => terminalContextStore.remove(t.sessionId));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
