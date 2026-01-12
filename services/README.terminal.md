# Terminal Service Documentation

## Overview

The Terminal Service provides a high-level interface for managing terminal sessions with PTY (pseudo-terminal) support. It handles IPC communication with the Tauri backend, event-based output streaming, error handling, and session lifecycle management.

## Features

- **Session Management**: Create, manage, and close multiple terminal sessions
- **PTY Support**: Full terminal emulation with ANSI escape codes
- **Event-Based Output**: Real-time terminal output via custom events
- **Error Handling**: Automatic error recovery and retry logic
- **Session Cleanup**: Automatic cleanup on unmount
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## Installation

The service is already included in the project. Import it from:

```typescript
import { terminalService } from '../services/terminalService';
```

## Basic Usage

### Creating a Session

```typescript
// Create a shell session
const sessionId = await terminalService.createSession('shell');

// Create with custom dimensions
const sessionId = await terminalService.createSession('shell', 100, 30);
```

### Writing to a Session

```typescript
// Execute a command (note the \n at the end)
await terminalService.writeToSession(sessionId, 'ls -la\n');

// Send input to interactive programs
await terminalService.writeToSession(sessionId, 'y\n');
```

### Reading Output

The service automatically polls for output and emits events:

```typescript
// Listen for terminal output
window.addEventListener('terminal-data', (event: CustomEvent) => {
  const { sessionId, data, type, timestamp } = event.detail;
  console.log(`[${type}] ${data}`);
});
```

### Resizing a Session

```typescript
// Resize terminal (e.g., when window resizes)
await terminalService.resizeSession(sessionId, 120, 40);
```

### Closing a Session

```typescript
// Close a specific session
await terminalService.closeSession(sessionId);

// Close all sessions (useful for cleanup)
await terminalService.closeAllSessions();
```

## Advanced Usage

### Session Information

```typescript
// Get local session info
const session = terminalService.getSession(sessionId);
console.log(session?.type, session?.isActive);

// Get all local sessions
const allSessions = terminalService.getAllSessions();

// Get backend session info
const sessionInfo = await terminalService.listSessions();
```

### Command History

```typescript
// Get command history for a session
const history = await terminalService.getSessionHistory(sessionId);
history.forEach(entry => {
  console.log(`${entry.command} - ${entry.status}`);
});
```

### Session State

```typescript
// Get current session state
const state = await terminalService.getSessionState(sessionId);
console.log(`Session state: ${state}`);
```

### Health Check

```typescript
// Check if service has active sessions
if (terminalService.isHealthy()) {
  console.log('Service is healthy');
}
```

## Event System

The service emits several custom events:

### terminal-data

Emitted when terminal output is received:

```typescript
interface TerminalDataEvent {
  sessionId: string;
  data: string;
  type: 'stdout' | 'stderr' | 'system';
  timestamp: number;
}

window.addEventListener('terminal-data', (event: CustomEvent<TerminalDataEvent>) => {
  // Handle output
});
```

### terminal-error

Emitted when an error occurs:

```typescript
interface TerminalErrorEvent {
  sessionId: string;
  error: string;
  timestamp: number;
}

window.addEventListener('terminal-error', (event: CustomEvent<TerminalErrorEvent>) => {
  // Handle error
});
```

### terminal-session-created

Emitted when a new session is created:

```typescript
window.addEventListener('terminal-session-created', (event: CustomEvent) => {
  const { sessionId, type } = event.detail;
});
```

### terminal-session-closed

Emitted when a session is closed:

```typescript
window.addEventListener('terminal-session-closed', (event: CustomEvent) => {
  const { sessionId } = event.detail;
});
```

## Error Handling

The service includes automatic error recovery:

```typescript
try {
  await terminalService.writeToSession(sessionId, 'command\n');
} catch (error) {
  // Error is logged and recovery is attempted automatically
  console.error('Write failed:', error);
}
```

### Recovery Mechanism

- Automatically attempts to recover failed sessions
- Maximum 3 reconnect attempts per session
- Sessions marked as inactive after max attempts
- Error events emitted for monitoring

## React Integration Example

```typescript
import React, { useEffect, useState } from 'react';
import { terminalService } from '../services/terminalService';

function TerminalComponent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    // Create session on mount
    terminalService.createSession('shell').then(setSessionId);

    // Listen for output
    const handleData = (event: CustomEvent) => {
      if (event.detail.sessionId === sessionId) {
        setOutput(prev => [...prev, event.detail.data]);
      }
    };

    window.addEventListener('terminal-data', handleData as EventListener);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('terminal-data', handleData as EventListener);
      if (sessionId) {
        terminalService.closeSession(sessionId);
      }
    };
  }, []);

  const handleCommand = async (cmd: string) => {
    if (sessionId) {
      await terminalService.writeToSession(sessionId, cmd + '\n');
    }
  };

  return (
    <div>
      <div className="output">
        {output.map((line, i) => <div key={i}>{line}</div>)}
      </div>
      <input onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommand(e.currentTarget.value);
          e.currentTarget.value = '';
        }
      }} />
    </div>
  );
}
```

## Configuration

### Polling Interval

The service polls for output every 100ms by default. This is configured in the service:

```typescript
private readonly POLLING_INTERVAL_MS = 100;
```

### Reconnect Attempts

Maximum reconnect attempts is set to 3:

```typescript
private readonly MAX_RECONNECT_ATTEMPTS = 3;
```

## Testing

Run the integration tests:

```bash
npm test services/__tests__/terminalService.test.ts
```

Note: Tests require the Tauri backend to be running.

## Troubleshooting

### Session Not Found

If you get "Session not found" errors:
- Ensure the session was created successfully
- Check if the session was already closed
- Verify the session ID is correct

### No Output Received

If terminal output is not appearing:
- Check that you're listening to 'terminal-data' events
- Verify the command includes a newline (`\n`)
- Check browser console for errors

### Performance Issues

If experiencing performance issues:
- Reduce polling frequency (increase POLLING_INTERVAL_MS)
- Limit number of concurrent sessions
- Clear old output regularly

## API Reference

See the TypeScript interfaces in `terminalService.ts` for complete API documentation.

## Related Components

- `TerminalPanel.tsx` - UI component that uses this service
- `src-tauri/src/terminal.rs` - Backend Tauri commands
- `backend/src/cli_bridge/` - Backend PTY implementation
