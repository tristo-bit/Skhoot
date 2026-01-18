# Tool Call Plugin System

A modular system for displaying AI tool call results in the Skhoot UI. Each tool has its own UI component that can be developed independently.

## 📁 Structure

```
/components/tool-calls/
├── /registry/              # Plugin registration system
│   ├── ToolCallRegistry.tsx   # Central registry
│   └── types.ts               # TypeScript interfaces
├── /file-operations/       # File-related tools
│   ├── ListDirectoryUI.tsx
│   ├── SearchFilesUI.tsx
│   ├── ReadFileUI.tsx
│   └── WriteFileUI.tsx
├── /shell-operations/      # Shell/terminal tools
│   ├── ShellCommandUI.tsx
│   └── TerminalUI.tsx
├── /web-operations/        # Web-related tools
│   └── WebSearchUI.tsx
├── /agent-operations/      # Agent management tools
│   ├── InvokeAgentUI.tsx
│   ├── ListAgentsUI.tsx
│   └── CreateAgentUI.tsx
├── /shared/                # Reusable components
│   ├── ToolCallContainer.tsx  # Common wrapper
│   ├── StatusBadge.tsx        # Status indicator
│   ├── ToolIcon.tsx           # Icon mapping
│   └── GenericToolCallUI.tsx  # Fallback UI
└── index.ts                # Public exports
```

## 🎨 For Designers: Working on Tool UIs

### Finding the Right File

Want to change how a tool looks? Find its file:

- **File operations** → `/file-operations/`
  - Directory listing → `ListDirectoryUI.tsx`
  - Directory loading → `ListDirectoryLoadingUI.tsx` (custom loading state)
  - File search → `SearchFilesUI.tsx`
  - Reading files → `ReadFileUI.tsx`
  - Writing files → `WriteFileUI.tsx`

- **Shell commands** → `/shell-operations/`
  - Shell output → `ShellCommandUI.tsx`
  - Terminal → `TerminalUI.tsx`

- **Web search** → `/web-operations/`
  - Search results → `WebSearchUI.tsx`
  - Search loading → `WebSearchLoadingUI.tsx` (custom loading state)
  - Custom wrapper → `WebSearchCustomWrapper.tsx` (complete card control)

- **Agents** → `/agent-operations/`
  - Invoke agent → `InvokeAgentUI.tsx`
  - List agents → `ListAgentsUI.tsx`
  - Create agent → `CreateAgentUI.tsx`

### Customization Options

Each tool plugin can customize:

1. **Loading State** - Custom animation while tool executes
2. **Card Design** - Complete control over card appearance
3. **Animations** - Entry/exit animations
4. **Styling** - Additional CSS classes
5. **Layout** - Grid, list, or compact views

### Example: Editing Web Search UI

1. **Change Results Display**: Edit `WebSearchUI.tsx`
2. **Change Loading Animation**: Edit `WebSearchLoadingUI.tsx`
3. **Change Card Design**: Edit `WebSearchCustomWrapper.tsx`

**That's it!** Each aspect is in its own file.

## 🔧 For Developers: Creating a New Plugin

### Step 1: Create the UI Component

Create a new file in the appropriate category folder:

```typescript
// components/tool-calls/your-category/YourToolUI.tsx
import React, { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

export const YourToolUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
  isExecuting,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);

  // Parse result
  const data = result?.output ? JSON.parse(result.output) : null;

  // Render your UI
  return (
    <div className="mt-2">
      {/* Your custom UI here */}
      <div className="p-3 rounded-lg glass-subtle">
        {/* Display your data */}
      </div>
    </div>
  );
});

YourToolUI.displayName = 'YourToolUI';
```

### Step 2: Register the Plugin

Add your plugin to `ToolCallRegistry.tsx`:

```typescript
import { YourToolUI } from '../your-category/YourToolUI';
import { YourToolLoadingUI } from '../your-category/YourToolLoadingUI'; // Optional
import { YourIcon } from 'lucide-react';

toolCallRegistry.register({
  toolName: 'your_tool_name',        // Must match tool name in agentChatService.ts
  displayName: 'Your Tool Name',     // Human-readable name
  category: 'other',                 // 'file' | 'shell' | 'web' | 'agent' | 'other'
  icon: YourIcon,                    // Lucide icon component
  component: YourToolUI,             // Your UI component
  
  // Optional: Custom loading component
  loadingComponent: YourToolLoadingUI,
  
  // Optional: Custom wrapper (complete card control)
  customWrapper: YourCustomWrapper,
  
  // Optional: Animations
  animations: {
    enter: 'animate-in fade-in slide-in-from-bottom-2 duration-400',
    exit: 'animate-out fade-out slide-out-to-top-2 duration-300',
    loading: 'animate-pulse',
  },
  
  // Optional: Custom styling
  styling: {
    cardClassName: 'hover:scale-[1.01] transition-transform',
    headerClassName: 'bg-gradient-to-r from-accent/10 to-purple-500/10',
    contentClassName: 'p-4',
  },
  
  supportedLayouts: ['compact', 'expanded'],
  description: 'What your tool does',
});
```

### Step 3: Export (Optional)

Add to `index.ts` if you want to export it:

```typescript
export { YourToolUI } from './your-category/YourToolUI';
```

**Done!** Your tool UI is now integrated.

## 📦 Available Props

Every plugin receives these props via `ToolCallUIProps`:

```typescript
interface ToolCallUIProps {
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, any>;
  };
  result?: {
    toolCallId: string;
    success: boolean;
    output: string;
    error?: string;
    durationMs?: number;
  };
  isExecuting?: boolean;
  onCancel?: () => void;
  sessionId?: string;
  onNavigate?: (path: string) => void;
  onAddToChat?: (fileName: string, filePath: string) => void;
}
```

## 🎯 Common Patterns

### Parsing JSON Output

```typescript
const data = useMemo(() => {
  if (!result?.output) return null;
  try {
    return JSON.parse(result.output);
  } catch {
    return null;
  }
}, [result]);
```

### Copy to Clipboard

```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(result?.output || '');
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

### Collapsible Content

```typescript
const [isCollapsed, setIsCollapsed] = useState(false);

// In render:
{isCollapsed ? (
  <div>Summary view</div>
) : (
  <div>Full content</div>
)}
```

### Layout Toggle (Grid/List)

```typescript
const [layout, setLayout] = useState<'grid' | 'list'>('list');

const toggleLayout = () => {
  setLayout(prev => prev === 'grid' ? 'list' : 'grid');
};
```

### Custom Loading Component

Create a custom loading UI that shows while the tool executes:

```typescript
// YourToolLoadingUI.tsx
import React, { memo } from 'react';
import { Loader2, YourIcon } from 'lucide-react';
import { ToolCallLoadingProps } from '../registry/types';

export const YourToolLoadingUI = memo<ToolCallLoadingProps>(({ toolCall, onCancel }) => {
  return (
    <div className="mt-2 p-4 rounded-xl border border-glass-border glass-subtle">
      <div className="flex items-center gap-3">
        <div className="relative">
          <YourIcon size={24} className="text-accent" />
          <Loader2 
            size={32} 
            className="absolute -top-1 -left-1 text-accent/30 animate-spin" 
          />
        </div>
        <div>
          <p className="text-[11px] font-bold">Processing...</p>
          <p className="text-[10px] text-text-secondary">
            {toolCall.arguments.someParam}
          </p>
        </div>
      </div>
      
      {/* Animated placeholders */}
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="h-12 rounded-lg glass-subtle animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});
```

### Custom Wrapper Component

Take complete control over the card design:

```typescript
// YourToolCustomWrapper.tsx
import React, { memo } from 'react';
import { ToolCallWrapperProps } from '../registry/types';
import { StatusBadge } from '../shared/StatusBadge';

export const YourToolCustomWrapper = memo<ToolCallWrapperProps>(({ 
  toolCall,
  result,
  isExecuting,
  onCancel,
  children,
  plugin,
}) => {
  const status = isExecuting ? 'executing' 
               : result?.success ? 'success' 
               : result ? 'error' 
               : 'executing';

  return (
    <div className="my-3 animate-in fade-in slide-in-from-right duration-500">
      {/* Your custom header */}
      <div className="rounded-t-xl bg-gradient-to-r from-accent/10 to-purple-500/10 p-3">
        <div className="flex items-center gap-3">
          <plugin.icon size={24} className="text-accent" />
          <div className="flex-1">
            <h3 className="text-[12px] font-bold">{plugin.displayName}</h3>
            <StatusBadge status={status} durationMs={result?.durationMs} />
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="rounded-b-xl border border-glass-border glass-subtle">
        {children}
      </div>
    </div>
  );
});
```

## 🧩 Shared Components

Use these components from `/shared/`:

### ToolCallContainer

Wraps your UI with common header/status (automatically used by AgentAction):

```typescript
<ToolCallContainer
  toolName="your_tool"
  displayName="Your Tool"
  icon={YourIcon}
  status="success"
  arguments={toolCall.arguments}
  summary="Optional summary text"
>
  {/* Your UI here */}
</ToolCallContainer>
```

### StatusBadge

Shows execution status:

```typescript
<StatusBadge status="success" durationMs={150} />
```

### ToolIcon

Gets icon for a tool name:

```typescript
<ToolIcon toolName="shell" size={16} />
```

## 🎨 Styling Guidelines

- Use Tailwind classes for styling
- Follow existing patterns for consistency
- Use `glass-subtle` and `glass-elevated` for glassmorphism
- Use `text-text-primary`, `text-text-secondary` for text colors
- Use `text-accent` for interactive elements
- Use `rounded-xl` for cards, `rounded-lg` for smaller elements
- Use `text-[11px]` for body text, `text-[10px]` for labels

## 🔍 Examples

### Simple Text Output

```typescript
export const SimpleToolUI = memo<ToolCallUIProps>(({ result }) => {
  return (
    <div className="mt-2">
      <pre className="text-[11px] font-mono p-3 rounded-xl glass-subtle">
        {result?.output || 'No output'}
      </pre>
    </div>
  );
});
```

### Card-Based Results

```typescript
export const CardToolUI = memo<ToolCallUIProps>(({ result }) => {
  const items = JSON.parse(result?.output || '[]');
  
  return (
    <div className="mt-2 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-lg glass-subtle hover:glass-elevated">
          <h3 className="text-[11px] font-bold">{item.title}</h3>
          <p className="text-[10px] text-text-secondary">{item.description}</p>
        </div>
      ))}
    </div>
  );
});
```

### Interactive Results

```typescript
export const InteractiveToolUI = memo<ToolCallUIProps>(({ result }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const items = JSON.parse(result?.output || '[]');
  
  return (
    <div className="mt-2 space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setSelected(item.id)}
          className={`w-full p-3 rounded-lg text-left transition-all ${
            selected === item.id 
              ? 'glass-elevated border-accent' 
              : 'glass-subtle hover:glass-elevated'
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
});
```

## 🚀 Benefits

- **Modular**: Each tool UI is independent
- **Maintainable**: Easy to find and edit specific tool UIs
- **Type-Safe**: Full TypeScript support
- **Reusable**: Shared components for common patterns
- **Extensible**: Add new tools without touching existing code
- **Designer-Friendly**: Clear file structure, no AI code to worry about

## 📚 Resources

- **Types**: See `registry/types.ts` for all interfaces
- **Examples**: Look at existing plugins for patterns
- **Shared Components**: Check `/shared/` for reusable UI
- **Icons**: Use [Lucide Icons](https://lucide.dev/) for consistency

## 🐛 Troubleshooting

**Plugin not showing up?**
- Check that it's registered in `ToolCallRegistry.tsx`
- Verify `toolName` matches exactly with the tool in `agentChatService.ts`

**TypeScript errors?**
- Ensure your component implements `ToolCallUIProps`
- Check that all required props are handled

**Styling issues?**
- Follow existing patterns in other plugins
- Use Tailwind classes consistently
- Test in both light and dark modes

## 💡 Tips

1. **Start with an existing plugin** - Copy a similar tool and modify it
2. **Use shared components** - Don't reinvent the wheel
3. **Keep it simple** - Focus on displaying the data clearly
4. **Test with real data** - Use the tool in chat to see actual output
5. **Follow conventions** - Match the style of existing plugins

---

**Questions?** Check existing plugins for examples or ask the team!
