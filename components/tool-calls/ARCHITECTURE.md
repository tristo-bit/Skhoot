# Tool Call Plugin System - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                     (Chat Conversation)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AgentAction.tsx                            │
│                    (Router Component)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Receives tool call + result                           │  │
│  │ 2. Looks up plugin in registry                           │  │
│  │ 3. Wraps plugin in ToolCallContainer                     │  │
│  │ 4. Renders plugin component                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ToolCallRegistry                             │
│                  (Plugin Management)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Map<toolName, ToolCallPlugin>                            │  │
│  │                                                          │  │
│  │ • get(toolName) → plugin                                │  │
│  │ • register(plugin)                                      │  │
│  │ • getByCategory(category)                               │  │
│  │ • getAll()                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Plugin Categories                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ File Operations  │  │ Shell Operations │                   │
│  ├──────────────────┤  ├──────────────────┤                   │
│  │ • ListDirectory  │  │ • ShellCommand   │                   │
│  │ • SearchFiles    │  │ • Terminal       │                   │
│  │ • ReadFile       │  └──────────────────┘                   │
│  │ • WriteFile      │                                          │
│  └──────────────────┘  ┌──────────────────┐                   │
│                        │ Web Operations   │                   │
│  ┌──────────────────┐  ├──────────────────┤                   │
│  │ Agent Operations │  │ • WebSearch      │                   │
│  ├──────────────────┤  └──────────────────┘                   │
│  │ • InvokeAgent    │                                          │
│  │ • ListAgents     │  ┌──────────────────┐                   │
│  │ • CreateAgent    │  │ Shared Components│                   │
│  └──────────────────┘  ├──────────────────┤                   │
│                        │ • Container      │                   │
│                        │ • StatusBadge    │                   │
│                        │ • ToolIcon       │                   │
│                        │ • GenericUI      │                   │
│                        └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│ AI Response  │
│ (tool_calls) │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ agentChatService.ts                                      │
│ • executeToolCall()                                      │
│ • Routes to backend/tool handlers                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Tool Result                                              │
│ { toolCallId, success, output, error, durationMs }      │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ AgentAction Component                                    │
│ • Receives: toolCall + result                           │
│ • Looks up: plugin = registry.get(toolCall.name)        │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ ToolCallContainer                                        │
│ • Renders header (icon, name, status)                   │
│ • Renders arguments (collapsible)                       │
│ • Wraps plugin component                                │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Plugin Component (e.g., WebSearchUI)                    │
│ • Parses result.output                                  │
│ • Renders custom UI                                     │
│ • Handles interactions                                  │
└──────────────────────────────────────────────────────────┘
```

## Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Registration                      │
│                    (App Initialization)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Registry.      │
                    │ register()     │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Plugin stored  │
                    │ in Map         │
                    └────────┬───────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tool Execution                         │
│                    (User triggers tool)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ AI calls tool  │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Backend        │
                    │ executes       │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Result         │
                    │ returned       │
                    └────────┬───────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Plugin Rendering                       │
│                    (UI displays result)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Registry.get() │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Plugin found?  │
                    └────┬───────┬───┘
                         │       │
                    Yes  │       │  No
                         │       │
                         ▼       ▼
              ┌──────────────┐  ┌──────────────┐
              │ Render       │  │ Render       │
              │ Plugin UI    │  │ Generic UI   │
              └──────────────┘  └──────────────┘
```

## Component Hierarchy

```
AgentAction
└── ToolCallContainer
    ├── Header
    │   ├── ToolIcon
    │   ├── DisplayName
    │   ├── StatusBadge
    │   ├── Summary
    │   └── Actions (Cancel, Expand/Collapse)
    │
    ├── Arguments (collapsible)
    │   └── JSON display
    │
    └── Plugin Component
        ├── Output Header
        │   └── Actions (Copy, Layout Toggle, etc.)
        │
        └── Custom UI
            ├── Parsed Data Display
            ├── Interactive Elements
            └── Error Handling
```

## Plugin Interface

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    ToolCallPlugin                           │
├─────────────────────────────────────────────────────────────┤
│ Metadata:                                                   │
│ • toolName: string          (e.g., "web_search")           │
│ • displayName: string       (e.g., "Web Search")           │
│ • category: ToolCategory    (e.g., "web")                  │
│ • icon: React.Component     (e.g., Globe)                  │
│ • description?: string                                      │
│                                                             │
│ Functionality:                                              │
│ • component: React.Component<ToolCallUIProps>              │
│ • parseResult?: (output, args) => any                      │
│ • supportedLayouts?: ToolLayout[]                          │
└─────────────────────────────────────────────────────────────┘
```

## Registry Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    ToolCallRegistry                         │
├─────────────────────────────────────────────────────────────┤
│ Private:                                                    │
│ • plugins: Map<string, ToolCallPlugin>                     │
│                                                             │
│ Public Methods:                                             │
│ • register(plugin: ToolCallPlugin): void                   │
│   └─> plugins.set(plugin.toolName, plugin)                │
│                                                             │
│ • get(toolName: string): ToolCallPlugin | undefined       │
│   └─> plugins.get(toolName)                               │
│                                                             │
│ • getByCategory(category: ToolCategory): ToolCallPlugin[] │
│   └─> filter plugins by category                          │
│                                                             │
│ • getAll(): ToolCallPlugin[]                               │
│   └─> Array.from(plugins.values())                        │
│                                                             │
│ • has(toolName: string): boolean                           │
│   └─> plugins.has(toolName)                               │
└─────────────────────────────────────────────────────────────┘
```

## Shared Components Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Components                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ToolCallContainer                                           │
│ ├─ Provides: Header, Status, Arguments display            │
│ ├─ Used by: All plugins (via AgentAction)                 │
│ └─ Props: toolName, displayName, icon, status, args       │
│                                                             │
│ StatusBadge                                                 │
│ ├─ Provides: Visual status indicator                      │
│ ├─ Used by: ToolCallContainer                             │
│ └─ Props: status, durationMs                              │
│                                                             │
│ ToolIcon                                                    │
│ ├─ Provides: Icon mapping for tools                       │
│ ├─ Used by: ToolCallContainer, fallback                   │
│ └─ Props: toolName, size, className                       │
│                                                             │
│ GenericToolCallUI                                           │
│ ├─ Provides: Fallback UI for unknown tools                │
│ ├─ Used by: AgentAction (when plugin not found)           │
│ └─ Props: ToolCallUIProps                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## File Organization

```
components/tool-calls/
│
├── registry/                    # Core system
│   ├── types.ts                # TypeScript interfaces
│   └── ToolCallRegistry.tsx    # Registry implementation
│
├── shared/                      # Reusable components
│   ├── ToolCallContainer.tsx   # Common wrapper
│   ├── StatusBadge.tsx         # Status indicator
│   ├── ToolIcon.tsx            # Icon mapping
│   └── GenericToolCallUI.tsx   # Fallback UI
│
├── file-operations/             # File tool plugins
│   ├── ListDirectoryUI.tsx
│   ├── SearchFilesUI.tsx
│   ├── ReadFileUI.tsx
│   └── WriteFileUI.tsx
│
├── shell-operations/            # Shell tool plugins
│   ├── ShellCommandUI.tsx
│   └── TerminalUI.tsx
│
├── web-operations/              # Web tool plugins
│   └── WebSearchUI.tsx
│
├── agent-operations/            # Agent tool plugins
│   ├── InvokeAgentUI.tsx
│   ├── ListAgentsUI.tsx
│   └── CreateAgentUI.tsx
│
├── index.ts                     # Public exports
├── README.md                    # Documentation
└── ARCHITECTURE.md              # This file
```

## Extension Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Adding a New Plugin                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Create Component                                         │
│    └─> components/tool-calls/category/YourToolUI.tsx       │
│                                                             │
│ 2. Implement Interface                                      │
│    └─> memo<ToolCallUIProps>(({ toolCall, result }) => {}) │
│                                                             │
│ 3. Register Plugin                                          │
│    └─> toolCallRegistry.register({                         │
│          toolName: 'your_tool',                            │
│          displayName: 'Your Tool',                         │
│          category: 'other',                                │
│          icon: YourIcon,                                   │
│          component: YourToolUI,                            │
│        })                                                   │
│                                                             │
│ 4. Export (Optional)                                        │
│    └─> export { YourToolUI } from './category/YourToolUI'  │
│                                                             │
│ ✅ Done! Plugin is now integrated                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Single Responsibility
- Each plugin handles ONE tool type
- Shared components handle common UI patterns
- Registry handles plugin management

### 2. Open/Closed Principle
- Open for extension (add new plugins)
- Closed for modification (no changes to core)

### 3. Dependency Inversion
- Plugins depend on interfaces, not implementations
- AgentAction depends on registry, not specific plugins

### 4. Composition over Inheritance
- Plugins compose shared components
- No inheritance hierarchy

### 5. Separation of Concerns
- AI logic: `agentChatService.ts`
- Plugin management: `ToolCallRegistry.tsx`
- UI rendering: Individual plugin files
- Common UI: Shared components

## Performance Considerations

### Registry Lookup
- O(1) Map lookup by tool name
- No iteration or searching
- Instant plugin resolution

### Component Rendering
- Plugins use React.memo for optimization
- Lazy evaluation with useMemo
- Minimal re-renders

### Code Splitting
- Each plugin is a separate module
- Can be lazy-loaded if needed
- Tree-shaking friendly

## Type Safety

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Type System                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ToolCallUIProps                                             │
│ └─> All plugins implement this interface                   │
│                                                             │
│ ToolCallPlugin                                              │
│ └─> Registry stores plugins of this type                   │
│                                                             │
│ ToolCategory                                                │
│ └─> Union type: 'file' | 'shell' | 'web' | 'agent' | ...  │
│                                                             │
│ ToolLayout                                                  │
│ └─> Union type: 'compact' | 'expanded' | 'grid'           │
│                                                             │
│ Compile-time checks ensure:                                │
│ • Plugins implement correct interface                      │
│ • Registry methods are type-safe                           │
│ • Props are correctly typed                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Summary

The plugin system provides:

✅ **Modularity**: Independent, self-contained plugins
✅ **Scalability**: Easy to add new tools
✅ **Maintainability**: Clear structure, easy to find code
✅ **Type Safety**: Full TypeScript support
✅ **Performance**: O(1) lookups, optimized rendering
✅ **Extensibility**: Open for extension, closed for modification
✅ **Reusability**: Shared components for common patterns
✅ **Testability**: Each plugin can be tested independently

---

**Architecture Version**: 1.0
**Last Updated**: January 18, 2026
**Status**: Production-Ready
