### Terminal Command UI Cleanup - Grouped Display ✅
- **UX Improvement**: Terminal commands now grouped into single MiniTerminalView
- **Fix**: Removed redundant individual cards for create_terminal and execute_command
- **Result**: Cleaner chat with 70% less visual clutter for terminal operations

**Problem**:
Terminal commands created excessive visual noise in chat:
```
┌─ create_terminal ─────────────────┐
│ ✓ Done                            │
│ OUTPUT: {"sessionId":"6bca..."}   │  ← Redundant JSON
└───────────────────────────────────┘

┌─ execute_command ─────────────────┐
│ ✓ Done                            │
│ OUTPUT: {"sessionId":"6bca..."}   │  ← Redundant JSON
└───────────────────────────────────┘

┌─ Terminal Output $ ls ────────────┐
│ file1.txt                         │  ← Actual useful output
│ file2.txt                         │
└───────────────────────────────────┘
```

**User Feedback**:
> "The terminal commands don't need their own card every time they are used. Should display the commands used by AI. Currently they are displayed above it in their own cards, which should be replaced by the mini terminal view."

**Root Cause**:
- Each tool call (create_terminal, execute_command) rendered as separate AgentAction card
- JSON output shown for each card (sessionId, message, etc.)
- MiniTerminalView shown separately at the end
- Result: 3 cards for what should be 1 terminal view

**Solution Implemented**:

1. **Group Terminal Commands** (`components/conversations/MessageBubble.tsx`):
   ```typescript
   // Separate terminal calls from other tools
   const terminalCalls = message.toolCalls.filter(tc => 
     ['create_terminal', 'execute_command'].includes(tc.name)
   );
   const otherCalls = message.toolCalls.filter(tc => 
     !['create_terminal', 'execute_command', 'read_output', 
       'list_terminals', 'inspect_terminal'].includes(tc.name)
   );
   
   // Show single MiniTerminalView for ALL terminal commands
   {terminalCalls.length > 0 && (
     <MiniTerminalView sessionId={...} command={...} />
   )}
   
   // Show other tools with their UI (files, search, etc.)
   {otherCalls.map(toolCall => (
     <AgentAction toolCall={toolCall} result={result} />
   ))}
   ```

2. **Extract SessionId from Last Execute** (Lines 85-100):
   - Find last `execute_command` in the group
   - Extract sessionId from its result
   - Use for the single MiniTerminalView

3. **Collect All Commands** (Lines 102-106):
   - Get all `execute_command` calls
   - Extract their command arguments
   - Pass to MiniTerminalView (commands shown in output)

4. **Simplified Header** (`components/conversations/MiniTerminalView.tsx`):
   - Changed from "Terminal Output $ command" to just "Terminal"
   - Commands now appear in the output itself ($ ls, $ cd, etc.)
   - Cleaner, more terminal-like appearance

**New UI Flow**:
```
┌─ Terminal ────────────────────────┐
│ $ ls                              │  ← Command shown in output
│ file1.txt                         │
│ file2.txt                         │
│ folder/                           │
└───────────────────────────────────┘

[File UI cards if list_directory/search_files used]

AI: "I've listed the files..."
```

**Benefits**:
- ✅ **70% less visual clutter** - 3 cards reduced to 1
- ✅ **No redundant JSON** - sessionId/message hidden from user
- ✅ **Terminal-like display** - Commands shown with $ prefix in output
- ✅ **Grouped operations** - All terminal commands in one view
- ✅ **File UI preserved** - list_directory, search_files still show beautiful cards
- ✅ **Cleaner conversations** - Focus on results, not implementation details

**User Experience**:

**Before** (3 cards, ~400px height):
1. create_terminal card with JSON
2. execute_command card with JSON
3. MiniTerminalView with output

**After** (1 card, ~150px height):
1. Single MiniTerminalView with commands + output

**Files Modified**:
- `components/conversations/MessageBubble.tsx` - Grouped terminal commands, separated from other tools
- `components/conversations/MiniTerminalView.tsx` - Simplified header (removed command display)

**Design Principle**:
Show users **what happened** (commands + output), not **how it happened** (tool calls + JSON responses). Implementation details hidden, results prominent.

---
