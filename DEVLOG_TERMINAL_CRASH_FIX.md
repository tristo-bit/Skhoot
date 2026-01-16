### Terminal UI Crash Fix - Missing Import & Safety Checks ✅
- **Critical Bug Fix**: Fixed crash when executing terminal commands
- **Issue**: Missing MiniTerminalView import and unsafe JSON parsing
- **Result**: Terminal commands now work without crashing

**Problem**:
App crashed immediately when user asked "launch a terminal and use ls":
- React error: Component not found
- JSON parsing errors on undefined values
- No error handling for missing data

**Root Causes**:

1. **Missing Import** (`components/conversations/MessageBubble.tsx`):
   ```typescript
   // ❌ MiniTerminalView used but not imported
   return <MiniTerminalView sessionId={...} />
   ```

2. **Unsafe JSON Parsing**:
   ```typescript
   // ❌ No check if result.output exists
   const parsed = JSON.parse(result.output);
   ```

3. **No Optional Chaining**:
   ```typescript
   // ❌ Crashes if arguments is undefined
   .map(tc => tc.arguments.command)
   ```

**Fixes Applied**:

1. **Added Missing Import** (Line 9):
   ```typescript
   import { MiniTerminalView } from './MiniTerminalView';
   ```

2. **Added Safety Checks** (Lines 93-95, 165-167):
   ```typescript
   const result = message.toolResults?.find(r => r.toolCallId === lastExecute.id);
   if (!result || !result.output) return null;  // ✅ Check exists
   ```

3. **Added Error Handling** (Lines 97-106, 169-178):
   ```typescript
   try {
     const parsed = JSON.parse(result.output);
     sessionId = parsed.data?.sessionId || parsed.sessionId || '';
   } catch (e) {
     console.error('[MessageBubble] Failed to parse terminal result:', e);
     // Fallback to regex
     const match = result.output.match(/sessionId['":\s]+([a-f0-9-]+)/i);
     sessionId = match ? match[1] : '';
   }
   
   if (!sessionId) {
     console.warn('[MessageBubble] No sessionId found in terminal result');
     return null;
   }
   ```

4. **Added Optional Chaining** (Lines 113-115, 185-187):
   ```typescript
   const commands = terminalCalls
     .filter(tc => tc.name === 'execute_command')
     .map(tc => tc.arguments?.command)  // ✅ Optional chaining
     .filter(Boolean);
   ```

5. **Added Unique Keys** (Lines 117, 189):
   ```typescript
   <MiniTerminalView
     key={`terminal-${sessionId}`}  // ✅ Unique key
     sessionId={sessionId}
     command={commands.join(' && ')}
     maxLines={10}
   />
   ```

**Error Handling Strategy**:
- **Graceful degradation**: If sessionId can't be extracted, return null (hide component)
- **Console logging**: Errors and warnings logged for debugging
- **Fallback parsing**: Try JSON first, then regex, then give up
- **Type safety**: Optional chaining prevents undefined access

**Result**:
- ✅ No more crashes when executing terminal commands
- ✅ Helpful error messages in console for debugging
- ✅ Graceful handling of malformed data
- ✅ Terminal UI displays correctly

**Testing**:
```
User: "launch a terminal and use ls"
→ create_terminal called
→ execute_command called
→ MessageBubble groups them
→ Extracts sessionId safely
→ Renders MiniTerminalView
→ ✅ No crash, terminal output displayed
```

**Files Modified**:
- `components/conversations/MessageBubble.tsx` - Added import, safety checks, error handling

**Lesson Learned**:
When refactoring component rendering logic:
1. Always import components before using them
2. Add null/undefined checks before parsing
3. Use optional chaining for nested properties
4. Add try-catch for JSON.parse operations
5. Log errors for debugging
6. Provide unique keys for React lists

---
