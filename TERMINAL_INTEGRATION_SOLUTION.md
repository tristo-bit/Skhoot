# Terminal Integration Solution

## Problem Statement

**Current Behavior:**
- AI can execute terminal commands ✅
- Terminal output is visible in Terminal panel ✅
- Tool call UI is hidden for terminal tools ✅
- **BUT**: AI still describes what it's doing verbosely ❌

**Example of current verbose output:**
```
User: Run ls
AI: I have executed the ls command in the terminal. The output is visible in your terminal panel.

[Tool calls shown:]
create_terminal
Done
{...}

Execute Command
Done
{...}

Terminal Output
$ ls
[files listed]

read_output
Done
{...}
```

**Desired Behavior:**
```
User: Run ls
AI: [executes command silently]

Terminal Output
$ ls
[files listed]
```

## Root Cause

The issue is NOT in the code - the terminal integration is working correctly. The problem is that the AI's system prompt doesn't explicitly tell it to be silent about terminal operations.

## Solution Implemented

### 1. Updated System Prompt (services/agentChatService.ts)

Added explicit guidance in the "Shell Commands" section:

```typescript
2. Shell Commands
   - You can run ANY shell command: system utilities, package managers, build tools, etc.
   - Use 'rg' (ripgrep) for fast text search when available, fall back to 'grep' if not
   - Use 'find' or 'fd' for file discovery
   - Run system analysis commands like 'df', 'du', 'free', 'top', 'ps', etc.
   - Install packages, run builds, execute scripts - whatever the task requires
   - IMPORTANT: When using terminal tools (create_terminal, execute_command), be BRIEF
   - The terminal output is automatically visible to the user - don't repeat it
   - Just execute commands and let the terminal show the results
   - Only mention terminal operations if there's an error or special context needed
```

### 2. Enhanced Tool Descriptions (services/agentTools/terminalTools.ts)

**create_terminal:**
```typescript
description: 'Create a new terminal session for executing commands. Returns a session ID that can be used to execute commands and read output. NOTE: Most conversations already have a terminal - only create a new one if explicitly needed. Terminal creation happens silently - no need to announce it.'
```

**execute_command:**
```typescript
description: 'Execute a command in a specific terminal session. The command will be sent to the terminal and executed asynchronously. IMPORTANT: The output is AUTOMATICALLY visible in the terminal panel - you do NOT need to describe what you did or call read_output. Just execute the command silently and move on. Only mention the command if there is an error or special context needed.'
```

## How It Works

### Current Architecture

```
User Message
    ↓
AI Agent (with system prompt)
    ↓
Tool Call: execute_command
    ↓
terminalTools.ts → handleExecuteCommand()
    ↓
terminalService.writeToSession()
    ↓
Backend Terminal Manager (Rust)
    ↓
PTY Session executes command
    ↓
Output streamed via WebSocket
    ↓
Terminal Panel displays output
```

### UI Flow

1. **MessageBubble.tsx** (lines 75-77, 92-94):
   - Filters out terminal tool calls from chat UI
   - Only shows non-terminal tool calls

2. **TerminalPanel.tsx**:
   - Listens for `terminal-data` events
   - Displays output in real-time

3. **MiniTerminalView.tsx**:
   - Shows compact terminal view in chat
   - Displays last N lines of output
   - Provides "expand to full terminal" button

## Testing the Solution

### Test Case 1: Simple Command
```
User: Run ls
Expected: AI executes silently, terminal shows output
```

### Test Case 2: Multiple Commands
```
User: Check disk space and list files
Expected: AI executes both commands silently, terminal shows both outputs
```

### Test Case 3: Command with Error
```
User: Run invalid_command
Expected: AI mentions the error and suggests alternatives
```

## Additional Improvements (Optional)

### Option A: Add a "Silent Mode" Flag

Add a flag to terminal tools to explicitly suppress AI responses:

```typescript
interface ToolContext {
  sessionId: string;
  workspaceRoot?: string;
  createdBy: 'user' | 'ai';
  silentMode?: boolean; // New flag
}
```

### Option B: Post-Process AI Responses

Filter out verbose terminal descriptions from AI responses:

```typescript
function cleanTerminalVerbosity(response: string): string {
  // Remove common verbose patterns
  const patterns = [
    /I have executed the .* command/gi,
    /The output is visible in .*terminal/gi,
    /I've run the command/gi,
  ];
  
  let cleaned = response;
  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned.trim();
}
```

### Option C: Use a Specialized Terminal Agent

Create a separate agent specifically for terminal operations with a minimal system prompt:

```typescript
const terminalAgentPrompt = `You are a terminal executor. Execute commands silently. Only respond if there's an error.`;
```

## Comparison with Codex-Main

Looking at how other projects handle this:

**Codex-Main Approach:**
- Uses a dedicated terminal service
- Terminal output is streamed directly to UI
- AI responses are minimal for terminal operations
- System prompt explicitly instructs brevity

**Our Implementation:**
- ✅ Dedicated terminal service (terminalService.ts)
- ✅ Real-time output streaming via WebSocket
- ✅ Tool calls hidden from chat UI
- ✅ System prompt now instructs brevity (after our changes)

## Expected Outcome

After these changes, the AI should:

1. **Execute terminal commands silently** - no verbose descriptions
2. **Only show terminal output** - in the Terminal panel
3. **Mention operations only when needed** - errors, warnings, or special context
4. **Provide a clean UX** - terminal acts as a shared workspace between user and AI

## Files Modified

1. `services/agentChatService.ts` - Updated system prompt
2. `services/agentTools/terminalTools.ts` - Enhanced tool descriptions

## Next Steps

1. **Test the changes** - Try various terminal commands and verify AI is less verbose
2. **Monitor AI behavior** - Check if AI still describes operations unnecessarily
3. **Fine-tune if needed** - Adjust system prompt based on observed behavior
4. **Consider Option B** - If AI is still verbose, add post-processing filter

## Notes

- The terminal integration is **already working correctly** at the code level
- The issue was purely about **AI behavior guidance**
- System prompts are powerful but not 100% reliable - AI may still be verbose occasionally
- If the problem persists, consider implementing Option B (post-processing) as a fallback

## References

- Terminal Tools: `services/agentTools/terminalTools.ts`
- Terminal Service: `services/terminalService.ts`
- Agent Chat Service: `services/agentChatService.ts`
- Message Bubble: `components/conversations/MessageBubble.tsx`
- Terminal Panel: `components/terminal/TerminalPanel.tsx`
- Mini Terminal View: `components/conversations/MiniTerminalView.tsx`
