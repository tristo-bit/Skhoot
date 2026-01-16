# Tool Call Display - File Analysis

## Problem
Terminal tool calls (`execute_command`, `create_terminal`) are completely hidden from chat UI, showing no feedback to user.

## Files Involved in Tool Call Display

### 1. **components/conversations/MessageBubble.tsx**
**Function**: Main message rendering component
**Issue**: Lines 76-77 and 93-94 filter out ALL terminal tools
```typescript
const isTerminalTool = ['create_terminal', 'execute_command', 'read_output', 'list_terminals', 'inspect_terminal'].includes(toolCall.name);
if (isTerminalTool) return null;  // ❌ HIDES EVERYTHING
```
**What it does**:
- Renders user and assistant messages
- Maps over `message.toolCalls` array
- For each tool call, renders `<AgentAction>` component
- BUT: Returns `null` for terminal tools, hiding them completely

### 2. **components/conversations/AgentAction.tsx**
**Function**: Renders individual tool call with results
**Current behavior**:
- Shows compact header with tool name, status, arguments
- Shows output based on tool type:
  - `list_directory` → File grid/list UI
  - `search_files` → Search results UI
  - `read_file` → Code viewer with syntax highlighting
  - `execute_command` / `shell` → MiniTerminalView component
  - Other → Raw text output

**Key sections**:
- Lines 320-360: Component definition and state
- Lines 407-416: `getResultSummary()` - generates summary text
- Lines 563-601: MiniTerminalView rendering for terminal commands
- Lines 566-600: SessionId extraction logic

### 3. **components/conversations/MiniTerminalView.tsx**
**Function**: Displays terminal output in chat (purple box)
**Current behavior**:
- Listens for `terminal-data` events
- Fetches initial output on mount
- Shows last N lines of output
- Has "Expand" button to open full terminal panel

**Key features**:
- Lines 29-52: Initial output fetching
- Lines 59-82: Event listener for new output
- Lines 104-145: Rendering (header + output + expand button)

### 4. **components/chat/ChatInterface.tsx**
**Function**: Main chat interface, handles message flow
**What it does**:
- Lines 635-651: Tracks tool calls and results during agent execution
- Lines 662-670: Creates assistant message with `toolCalls` and `toolResults`
- Passes messages to MessageBubble for rendering

### 5. **services/agentService.ts**
**Function**: Executes agent tools and manages results
**What it does**:
- Lines 429-441: Transforms `ToolResult` to `AgentToolResultData`
- Converts `result.data` object to JSON string in `output` field
- This is why sessionId ends up as `JSON.stringify(result.data)`

### 6. **services/agentTools/terminalTools.ts**
**Function**: Implements terminal tool handlers
**What it returns**:
- `execute_command` returns:
  ```typescript
  {
    success: true,
    data: {
      sessionId: "...",
      command: "ls",
      message: "Command executed successfully..."
    }
  }
  ```

### 7. **types.ts**
**Function**: Type definitions
**Key types**:
- `AgentToolCallData` - Tool call information
- `AgentToolResultData` - Tool result with output string
- `Message` - Message with optional toolCalls and toolResults

## The Flow

```
1. User: "launch terminal and use ls"
   ↓
2. ChatInterface.tsx
   - Calls agentChatService.executeWithTools()
   - Tracks toolCalls and toolResults
   ↓
3. agentService.ts
   - Executes execute_command tool
   - Gets: { success: true, data: { sessionId, command, message } }
   - Transforms to: { output: JSON.stringify(data) }
   ↓
4. ChatInterface.tsx
   - Creates Message with toolCalls and toolResults
   - Passes to MessageBubble
   ↓
5. MessageBubble.tsx
   - Maps over message.toolCalls
   - Checks: isTerminalTool? → YES
   - Returns: null  ❌ NOTHING RENDERED
   ↓
6. User sees: Just the assistant text, no tool UI
```

## The Problem

**MessageBubble.tsx is hiding terminal tools completely!**

Lines 76-77:
```typescript
const isTerminalTool = ['create_terminal', 'execute_command', ...].includes(toolCall.name);
if (isTerminalTool) return null;  // ❌ This hides everything!
```

## Solutions

### Option 1: Show MiniTerminalView in Chat (Recommended)
Remove the filter for `execute_command` and `create_terminal`, keep hiding only `read_output`, `list_terminals`, `inspect_terminal`:

```typescript
// Only hide these utility tools
const isHiddenTool = ['read_output', 'list_terminals', 'inspect_terminal'].includes(toolCall.name);
if (isHiddenTool) return null;

// execute_command and create_terminal will now render AgentAction
// which will show MiniTerminalView
```

### Option 2: Show Minimal Indicator
Keep hiding but add a small indicator:

```typescript
if (isTerminalTool) {
  return (
    <div className="text-xs text-purple-400 flex items-center gap-1">
      <Terminal size={12} />
      Command executed in terminal
    </div>
  );
}
```

### Option 3: Show Compact Summary
Show a collapsed version with expand option:

```typescript
if (isTerminalTool) {
  return (
    <div className="compact-tool-indicator">
      💻 {toolCall.arguments.command} → Terminal
      <button onClick={() => openTerminal(sessionId)}>View</button>
    </div>
  );
}
```

## Recommendation

**Use Option 1**: Remove the filter for `execute_command` and `create_terminal`. This will:
- Show the MiniTerminalView component we already built
- Display terminal output in chat (purple box)
- Provide "Expand" button to open full terminal
- Give users immediate feedback

The MiniTerminalView is already implemented and working, we just need to stop hiding it!
