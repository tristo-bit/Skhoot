# Terminal Output Display Fix - Visual Diagram

## Before Fix (Race Condition) ❌

```
┌─────────────────────────────────────────────────────────────────┐
│ Timeline: Terminal Command Execution                            │
└─────────────────────────────────────────────────────────────────┘

t=0ms     │ AI executes: execute_command({ command: "ls" })
          │ ↓
          │ createSession() → sessionId: "abc-123"
          │ startPolling(sessionId) → setInterval(100ms)
          │
t=100ms   │ First poll → output: ["ls\r\n", "file1.txt\r\n", ...]
          │ ↓
          │ window.dispatchEvent('terminal-data', { sessionId, data })
          │ ↓
          │ ❌ NO LISTENERS! Event lost forever
          │
t=150ms   │ React renders MessageBubble
          │ ↓
          │ Processes toolCalls, creates MiniTerminalView
          │
t=200ms   │ MiniTerminalView mounts
          │ ↓
          │ useEffect() runs
          │ ↓
          │ addEventListener('terminal-data', handler)
          │ ↓
          │ output = [] (empty)
          │ ↓
          │ Displays: "Waiting for output..." ❌
          │
t=300ms   │ Second poll → output: [] (already consumed)
          │ ↓
          │ No new events emitted
          │
t=∞       │ Component stuck showing "Waiting for output..." forever ❌
```

## After Fix (Output Buffering) ✅

```
┌─────────────────────────────────────────────────────────────────┐
│ Timeline: Terminal Command Execution with Buffering            │
└─────────────────────────────────────────────────────────────────┘

t=0ms     │ AI executes: execute_command({ command: "ls" })
          │ ↓
          │ createSession() → sessionId: "abc-123"
          │ startPolling(sessionId)
          │ ↓
          │ outputBuffer.set("abc-123", []) ← Initialize buffer
          │
t=100ms   │ First poll → output: ["ls\r\n", "file1.txt\r\n", ...]
          │ ↓
          │ FOR EACH line:
          │   ├─ Add to buffer: outputBuffer.get("abc-123").push(line)
          │   └─ Emit event: window.dispatchEvent('terminal-data', ...)
          │ ↓
          │ Buffer: ["ls\r\n", "file1.txt\r\n", "file2.txt\r\n"]
          │ Events: Emitted (no listeners yet, but buffered!)
          │
t=150ms   │ React renders MessageBubble
          │ ↓
          │ Processes toolCalls, creates MiniTerminalView
          │
t=200ms   │ MiniTerminalView mounts
          │ ↓
          │ useEffect() runs
          │ ↓
          │ buffered = getBufferedOutput("abc-123")
          │ ↓
          │ buffered = ["ls\r\n", "file1.txt\r\n", "file2.txt\r\n"]
          │ ↓
          │ setOutput(buffered) ✅
          │ ↓
          │ Displays: "ls\r\nfile1.txt\r\nfile2.txt\r\n" ✅
          │ ↓
          │ addEventListener('terminal-data', handler) ← Ready for new output
          │
t=300ms   │ Second poll → output: ["file3.txt\r\n"]
          │ ↓
          │ Add to buffer + emit event
          │ ↓
          │ Event received by listener ✅
          │ ↓
          │ setOutput(prev => [...prev, "file3.txt\r\n"])
          │ ↓
          │ Displays: "ls\r\nfile1.txt\r\nfile2.txt\r\nfile3.txt\r\n" ✅
```

## Key Components

### terminalHttpService (Buffer Manager)
```typescript
class TerminalHttpService {
  private outputBuffer: Map<string, string[]> = new Map();
  
  startPolling(sessionId) {
    this.outputBuffer.set(sessionId, []); // Initialize
    
    setInterval(async () => {
      const output = await this.read(sessionId);
      output.forEach(line => {
        // Add to buffer
        const buffer = this.outputBuffer.get(sessionId);
        buffer.push(line);
        
        // Emit event (for already-mounted components)
        window.dispatchEvent(new CustomEvent('terminal-data', {
          detail: { sessionId, data: line }
        }));
      });
    }, 100);
  }
  
  getBufferedOutput(sessionId): string[] {
    return this.outputBuffer.get(sessionId) || [];
  }
}
```

### MiniTerminalView (Consumer)
```typescript
useEffect(() => {
  // 1. Fetch buffered output (for late-mounting components)
  const buffered = terminalHttpService.getBufferedOutput(sessionId);
  if (buffered.length > 0) {
    setOutput(buffered); // ✅ Immediate display
  }
  
  // 2. Listen for new events (for live updates)
  const handler = (event) => {
    if (event.detail.sessionId === sessionId) {
      setOutput(prev => [...prev, event.detail.data]); // ✅ Live updates
    }
  };
  
  window.addEventListener('terminal-data', handler);
  return () => window.removeEventListener('terminal-data', handler);
}, [sessionId]);
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Output Display** | "Waiting for output..." forever | Immediate display of full output |
| **Event Timing** | Lost if emitted before mount | Buffered and retrieved on mount |
| **Live Updates** | Never received | Continues to receive via events |
| **Memory Usage** | N/A | Limited to 100 lines per session |
| **Cleanup** | N/A | Automatic when polling stops |

## Testing Checklist

- [ ] Ask AI: "launch a terminal and use ls in it"
- [ ] Verify MiniTerminalView shows actual output (not "Waiting for output...")
- [ ] Verify output includes command: "ls"
- [ ] Verify output includes results: file listings
- [ ] Verify new output continues to appear in real-time
- [ ] Verify buffer is cleaned up when session closes
- [ ] Verify multiple sessions don't interfere with each other
