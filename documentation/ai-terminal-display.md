# AI Terminal Display Feature

## Overview

This feature automatically displays terminals created by the AI in the Terminal Panel (both TerminalPanel and TerminalView components), making it easy for users to see and interact with AI-controlled terminal sessions.

## How It Works

### 1. Terminal Creation by AI

When the AI creates a terminal using the `create_terminal` tool:

```typescript
// In services/agentTools/terminalTools.ts
export async function handleCreateTerminal(args, agentSessionId) {
  const sessionId = await terminalService.createSession(type);
  
  // Register context to track AI ownership
  terminalContextStore.register(sessionId, {
    sessionId: agentSessionId,
    workspaceRoot: args.workspaceRoot,
    createdBy: 'ai',
  });
  
  // Emit event to notify UI
  window.dispatchEvent(new CustomEvent('ai-terminal-created', {
    detail: {
      sessionId,
      type,
      createdBy: 'ai',
      workspaceRoot: args.workspaceRoot,
      agentSessionId,
    }
  }));
}
```

### 2. Terminal Components Listen for AI Terminals

Both TerminalPanel and TerminalView listen for the `ai-terminal-created` event and automatically create a new tab:

```typescript
// In components/terminal/TerminalPanel.tsx
useEffect(() => {
  const handleAITerminalCreated = (event: CustomEvent) => {
    const { sessionId, type, createdBy, workspaceRoot } = event.detail;
    
    // Create new tab for AI-created terminal
    const newTab: TerminalTab = {
      id: `tab-${Date.now()}-${sessionId}`,
      title: type === 'shell' ? 'Shell (AI)' : 'Codex (AI)',
      type,
      sessionId,
      createdBy,
      workspaceRoot,
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };
  
  window.addEventListener('ai-terminal-created', handleAITerminalCreated);
}, [tabs]);
```

### 3. App Opens Terminal Panel

The main App component listens for the same event and automatically opens the Terminal Panel:

```typescript
// In App.tsx
useEffect(() => {
  const handleAITerminalCreated = () => {
    setIsTerminalOpen(true);
    // Close other panels
    setIsFileExplorerOpen(false);
    setIsWorkflowsOpen(false);
  };
  
  window.addEventListener('ai-terminal-created', handleAITerminalCreated);
}, []);
```

## Visual Indicators

### AI Badge

Terminals created by AI display a distinctive badge:

```tsx
{tab.createdBy === 'ai' && (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
    <Bot size={10} className="text-cyan-400" />
    <span className="text-xs text-cyan-400 font-medium">AI</span>
  </div>
)}
```

### Workspace Root Display

If the AI specified a workspace root, it's displayed in the terminal header:

```tsx
{activeTab.workspaceRoot && (
  <div className="px-4 py-2 border-b glass-subtle flex items-center gap-2">
    <Terminal size={14} />
    <span className="text-xs font-mono">
      Workspace: {activeTab.workspaceRoot}
    </span>
    {activeTab.createdBy === 'ai' && (
      <div className="flex items-center gap-1 text-xs text-cyan-400">
        <Bot size={12} />
        <span>AI Controlled</span>
      </div>
    )}
  </div>
)}
```

## Benefits

1. **Automatic Display**: Users don't need to manually open the terminal panel when AI creates a terminal
2. **Clear Attribution**: AI-created terminals are clearly marked with badges
3. **Context Awareness**: Workspace root is displayed so users know where commands are executing
4. **Seamless Integration**: The feature works automatically without requiring user configuration

## Event Flow

```
AI Agent
  ↓
create_terminal tool
  ↓
terminalService.createSession()
  ↓
terminalContextStore.register() (tracks AI ownership)
  ↓
window.dispatchEvent('ai-terminal-created')
  ↓
  ├─→ App.tsx: Opens Terminal Panel
  └─→ TerminalPanel.tsx: Creates new tab with AI badge
```

## Testing

The feature is covered by property-based tests in `services/agentTools/__tests__/terminalTools.test.ts`:

- **Property 6**: AI control badge display - validates that terminals created by AI are properly marked
- Tests verify that `terminalContextStore` correctly tracks AI-created terminals
- Tests ensure `isAICreated()` helper correctly identifies AI terminals

## Future Enhancements

Potential improvements for this feature:

1. Add animation when terminal panel opens automatically
2. Show notification when AI creates a terminal
3. Allow users to configure auto-open behavior
4. Add terminal session history for AI-created terminals
5. Implement terminal sharing between AI and user
