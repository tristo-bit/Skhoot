/**
 * Tests for Direct Tool Call Feature in AgentChatService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agentChatService } from '../agentChatService';
import type { AgentChatOptions } from '../agentChatService';

// Mock dependencies
vi.mock('../backendApi', () => ({
  backendApi: {
    executeShellCommand: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    listDirectory: vi.fn(),
    aiFileSearch: vi.fn(),
    webSearch: vi.fn(),
  },
}));

vi.mock('../agentTools/terminalTools', () => ({
  executeTerminalTool: vi.fn(),
}));

vi.mock('../agentTools/agentTools', () => ({
  invokeAgent: vi.fn(),
  listAgents: vi.fn(),
  createAgent: vi.fn(),
}));

describe('AgentChatService - Direct Tool Call', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWithTools with directToolCall', () => {
    it('executes tool directly when directToolCall is provided', async () => {
      const { backendApi } = await import('../backendApi');
      
      vi.mocked(backendApi.executeShellCommand).mockResolvedValue({
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        exitCode: 0,
      });

      const options: AgentChatOptions = {
        sessionId: 'test-session',
        directToolCall: {
          name: 'shell',
          arguments: { command: 'ls' },
        },
      };

      const result = await agentChatService.executeWithTools(
        'Execute tool',
        [],
        options
      );

      expect(result.content).toContain('Tool executed successfully');
      expect(result.content).toContain('shell');
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].success).toBe(true);
    });
  });
});
