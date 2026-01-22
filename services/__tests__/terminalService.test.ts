/**
 * Terminal Service Integration Tests
 * 
 * These tests verify the terminal service functionality.
 * Note: These are integration tests that require the Tauri backend to be running.
 */

import { terminalService, TerminalSession, TerminalOutput } from '../terminal/terminalService';

describe('TerminalService', () => {
  let testSessionId: string;

  afterEach(async () => {
    // Cleanup: close all sessions after each test
    if (testSessionId) {
      try {
        await terminalService.closeSession(testSessionId);
      } catch (error) {
        // Session might already be closed
      }
    }
  });

  describe('Session Management', () => {
    it('should create a new shell session', async () => {
      testSessionId = await terminalService.createSession('shell');
      
      expect(testSessionId).toBeDefined();
      expect(typeof testSessionId).toBe('string');
      expect(testSessionId.length).toBeGreaterThan(0);
    });

    it('should store session locally', async () => {
      testSessionId = await terminalService.createSession('shell');
      
      const session = terminalService.getSession(testSessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(testSessionId);
      expect(session?.type).toBe('shell');
      expect(session?.isActive).toBe(true);
    });

    it('should list all sessions', async () => {
      testSessionId = await terminalService.createSession('shell');
      
      const sessions = terminalService.getAllSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.some(s => s.id === testSessionId)).toBe(true);
    });

    it('should close a session', async () => {
      testSessionId = await terminalService.createSession('shell');
      await terminalService.closeSession(testSessionId);
      
      const session = terminalService.getSession(testSessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('IPC Communication', () => {
    beforeEach(async () => {
      testSessionId = await terminalService.createSession('shell');
    });

    it('should write to a session', async () => {
      await expect(
        terminalService.writeToSession(testSessionId, 'echo "test"\n')
      ).resolves.not.toThrow();
    });

    it('should read from a session', async () => {
      const outputs = await terminalService.readFromSession(testSessionId);
      expect(Array.isArray(outputs)).toBe(true);
    });

    it('should resize a session', async () => {
      await expect(
        terminalService.resizeSession(testSessionId, 100, 30)
      ).resolves.not.toThrow();
    });

    it('should get session state', async () => {
      const state = await terminalService.getSessionState(testSessionId);
      expect(typeof state).toBe('string');
    });

    it('should get session history', async () => {
      const history = await terminalService.getSessionHistory(testSessionId);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid session write', async () => {
      await expect(
        terminalService.writeToSession('invalid-session-id', 'test')
      ).rejects.toThrow();
    });

    it('should throw error for invalid session resize', async () => {
      await expect(
        terminalService.resizeSession('invalid-session-id', 80, 24)
      ).rejects.toThrow();
    });

    it('should handle read errors gracefully', async () => {
      const outputs = await terminalService.readFromSession('invalid-session-id');
      expect(outputs).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    it('should emit terminal-data events', (done) => {
      const handler = (event: CustomEvent) => {
        expect(event.detail).toHaveProperty('sessionId');
        expect(event.detail).toHaveProperty('data');
        expect(event.detail).toHaveProperty('type');
        window.removeEventListener('terminal-data', handler as EventListener);
        done();
      };

      window.addEventListener('terminal-data', handler as EventListener);

      terminalService.createSession('shell').then(sessionId => {
        testSessionId = sessionId;
        terminalService.writeToSession(sessionId, 'echo "test"\n');
      });
    }, 10000); // 10 second timeout for async event

    it('should emit terminal-error events on errors', (done) => {
      const handler = (event: CustomEvent) => {
        expect(event.detail).toHaveProperty('sessionId');
        expect(event.detail).toHaveProperty('error');
        expect(event.detail).toHaveProperty('timestamp');
        window.removeEventListener('terminal-error', handler as EventListener);
        done();
      };

      window.addEventListener('terminal-error', handler as EventListener);

      // Trigger an error by writing to invalid session
      terminalService.writeToSession('invalid-session-id', 'test').catch(() => {});
    }, 5000);
  });

  describe('Lifecycle Management', () => {
    it('should cleanup on closeAllSessions', async () => {
      const sessionId1 = await terminalService.createSession('shell');
      const sessionId2 = await terminalService.createSession('shell');
      
      await terminalService.closeAllSessions();
      
      expect(terminalService.getSession(sessionId1)).toBeUndefined();
      expect(terminalService.getSession(sessionId2)).toBeUndefined();
      expect(terminalService.getAllSessions().length).toBe(0);
    });

    it('should report health status', async () => {
      testSessionId = await terminalService.createSession('shell');
      expect(terminalService.isHealthy()).toBe(true);
      
      await terminalService.closeSession(testSessionId);
      expect(terminalService.isHealthy()).toBe(false);
    });
  });

  describe('Recovery', () => {
    it('should handle session recovery attempts', async () => {
      testSessionId = await terminalService.createSession('shell');
      
      // Simulate multiple failed writes
      for (let i = 0; i < 3; i++) {
        try {
          await terminalService.writeToSession('invalid-id', 'test');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Original session should still work
      await expect(
        terminalService.writeToSession(testSessionId, 'echo "test"\n')
      ).resolves.not.toThrow();
    });
  });
});
