### Terminal Output Display - Enhanced Debugging & Retry Logic ✅
- **Improvement**: Added comprehensive logging to trace output flow
- **Improvement**: Multiple retry attempts to fetch terminal output
- **Issue**: MiniTerminalView showing "Waiting for output..." instead of actual terminal content

**Problem**:
MiniTerminalView displays "Waiting for output..." even though terminal commands executed successfully:
- Commands execute ✅
- SessionId extracted ✅
- But output not displayed ❌

**Possible Causes**:
1. Output arrives after component mounts
2. SessionId not matching between command execution and display
3. Terminal polling not emitting events
4. Output being filtered or lost

**Debugging Enhancements Added**:

1. **MessageBubble Logging** (`components/conversations/MessageBubble.tsx`):
   ```typescript
   console.log('[MessageBubble] Processing terminal calls:', terminalCalls);
   console.log('[MessageBubble] Last execute:', lastExecute);
   console.log('[MessageBubble] Found result:', result);
   console.log('[MessageBubble] Parsed output:', parsed);
   console.log('[MessageBubble] Extracted sessionId:', sessionId);
   console.log('[MessageBubble] Commands:', commands);
   ```
   
   **Shows**:
   - Which terminal calls are being processed
   - What result data looks like
   - How sessionId is extracted
   - What commands are being passed

2. **MiniTerminalView Logging** (`components/conversations/MiniTerminalView.tsx`):
   ```typescript
   console.log('[MiniTerminalView] No sessionId provided');
   console.log('[MiniTerminalView] Fetching initial output for session:', sessionId);
   console.log('[MiniTerminalView] Raw outputs:', outputs);
   console.log('[MiniTerminalView] Got initial output:', outputs.length, 'items');
   console.log('[MiniTerminalView] Filtered lines:', lines);
   console.log('[MiniTerminalView] No outputs received');
   ```
   
   **Shows**:
   - Whether sessionId is received
   - What raw output looks like from terminalService
   - How many lines after filtering
   - Whether fetch succeeded or failed

3. **Multiple Retry Strategy** (Lines 28-56):
   ```typescript
   // Fetch immediately
   fetchInitialOutput();
   
   // Retry multiple times to catch output that arrives after command execution
   const timeouts = [
     setTimeout(fetchInitialOutput, 300),   // 300ms
     setTimeout(fetchInitialOutput, 800),   // 800ms
     setTimeout(fetchInitialOutput, 1500),  // 1500ms
   ];
   ```
   
   **Why Multiple Retries**:
   - Command execution takes time
   - Output may not be available immediately
   - Backend polling interval is 100ms
   - Network latency varies
   - Gives output time to arrive and be polled

**Diagnostic Flow**:
```
1. User: "launch terminal and use ls"
   ↓
2. [MessageBubble] Processing terminal calls
   → Shows: create_terminal, execute_command
   ↓
3. [MessageBubble] Extracted sessionId
   → Shows: "abc-123-def-456"
   ↓
4. [MiniTerminalView] Fetching initial output for session: abc-123
   → Attempt 1: Immediate
   → Attempt 2: 300ms later
   → Attempt 3: 800ms later
   → Attempt 4: 1500ms later
   ↓
5. [MiniTerminalView] Raw outputs
   → Shows: Array of TerminalOutput objects
   ↓
6. [MiniTerminalView] Filtered lines
   → Shows: Actual command output lines
```

**Expected Console Output** (Success):
```
[MessageBubble] Processing terminal calls: [{name: "create_terminal"}, {name: "execute_command"}]
[MessageBubble] Last execute: {name: "execute_command", arguments: {command: "ls"}}
[MessageBubble] Found result: {success: true, output: '{"data":{"sessionId":"abc-123"}}'}
[MessageBubble] Parsed output: {data: {sessionId: "abc-123", command: "ls"}}
[MessageBubble] Extracted sessionId: abc-123-def-456
[MessageBubble] Commands: ["ls"]
[MiniTerminalView] Fetching initial output for session: abc-123-def-456
[MiniTerminalView] Raw outputs: [{output_type: "stdout", content: "file1.txt\nfile2.txt"}]
[MiniTerminalView] Got initial output: 1 items
[MiniTerminalView] Filtered lines: ["file1.txt", "file2.txt"]
[MiniTerminalView] Render: {sessionId: "abc-123", outputLength: 2, displayLength: 2}
```

**Expected Console Output** (Failure - No Output):
```
[MessageBubble] Extracted sessionId: abc-123-def-456
[MiniTerminalView] Fetching initial output for session: abc-123-def-456
[MiniTerminalView] Raw outputs: []
[MiniTerminalView] No outputs received
[MiniTerminalView] Render: {sessionId: "abc-123", outputLength: 0, displayLength: 0}
```

**Next Steps for Diagnosis**:
1. Check console for `[MessageBubble]` logs - Is sessionId extracted?
2. Check console for `[MiniTerminalView]` logs - Is output fetched?
3. Check if sessionId matches between extraction and display
4. Check if `terminalService.readFromSession()` returns data
5. Check if terminal polling is running (look for `[TerminalHttpService]` logs)

**Files Modified**:
- `components/conversations/MessageBubble.tsx` - Added detailed logging for sessionId extraction
- `components/conversations/MiniTerminalView.tsx` - Added logging and multiple retry attempts

**Purpose**:
These logs will help identify exactly where the output flow breaks:
- Is sessionId wrong?
- Is output not being polled?
- Is output being filtered out?
- Is timing the issue?

---
