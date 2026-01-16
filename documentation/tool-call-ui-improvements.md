# Tool Call UI Improvements - Design Proposal

## Current State Analysis

### What Works Well ✅
- Purple terminal output is visually distinct
- Expandable details for arguments
- File UI integration (grid/list views)
- Status badges (executing/success/error)
- Copy functionality

### Pain Points ❌
1. **Too Verbose** - Every tool call takes significant vertical space
2. **Repetitive** - Multiple similar tool calls create visual noise
3. **Always Expanded** - Output shown by default, clutters conversation
4. **No Grouping** - Related tool calls shown separately
5. **Terminal Tools Redundant** - Already shown in terminal panel

## Proposed Improvements

### 1. **Collapsed by Default** - Minimize Visual Noise

Tool calls should be collapsed by default, showing only essential info:

```
┌─────────────────────────────────────────────────┐
│ 🔧 3 tools executed • 245ms • ✓ All successful │
│ ▸ list_directory, search_files, read_file      │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- Reduces vertical space by ~80%
- Cleaner conversation flow
- User can expand if interested

### 2. **Group Related Tool Calls** - Batch Operations

When AI makes multiple tool calls in sequence, group them:

```
┌─────────────────────────────────────────────────┐
│ 🔧 File Operations (3 tools) • 245ms            │
│ ▸ Click to see details                          │
└─────────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────────┐
│ 🔧 File Operations (3 tools) • 245ms            │
│ ▾ Details                                       │
│                                                 │
│ 1. list_directory ./src • 45ms ✓               │
│ 2. search_files "*.tsx" • 120ms ✓ 15 files     │
│ 3. read_file App.tsx • 80ms ✓ 234 lines        │
└─────────────────────────────────────────────────┘
```

### 3. **Smart Summaries** - Show What Matters

Instead of raw output, show intelligent summaries:

**Before:**
```
list_directory
Output: [500 lines of file listing]
```

**After:**
```
list_directory ./src
📁 15 folders, 42 files • 2.3 MB total
```

**Before:**
```
search_files
Output: [grep results with line numbers]
```

**After:**
```
search_files "useState"
🔍 Found in 8 files • 23 matches
```

### 4. **Progressive Disclosure** - Three Levels

**Level 1: Collapsed (Default)**
```
🔧 3 tools • 245ms • ✓
```

**Level 2: Summary (One Click)**
```
🔧 File Operations (3 tools) • 245ms
├─ list_directory • 15 folders, 42 files
├─ search_files • 8 files, 23 matches
└─ read_file • 234 lines
```

**Level 3: Full Details (Two Clicks)**
```
🔧 File Operations (3 tools) • 245ms
├─ list_directory ./src
│  Arguments: { path: "./src", recursive: false }
│  Output: [Full file listing with UI]
├─ search_files "useState"
│  Arguments: { pattern: "useState", path: "./src" }
│  Output: [File cards with matches]
└─ read_file App.tsx
   Arguments: { path: "App.tsx" }
   Output: [Full file content with syntax highlighting]
```

### 5. **Inline Micro-UI** - Compact Representations

For common operations, show micro-UI instead of full output:

**File Operations:**
```
📁 list_directory ./src
   [📂 components] [📂 hooks] [📂 services] [📄 App.tsx] +38 more
```

**Search Results:**
```
🔍 search_files "useState"
   [App.tsx:12] [Header.tsx:5] [Form.tsx:23] +5 more
```

**Terminal Commands:**
```
💻 npm install
   ✓ Added 3 packages in 2.4s
```

### 6. **Terminal Tool Special Treatment**

Terminal tools should be **ultra-minimal** since they're already in the terminal panel:

**Current:**
```
┌─────────────────────────────────────────────────┐
│ 🔧 Execute Command                              │
│ ▾ Details                                       │
│ Command: ls -la                                 │
│ Output: [Terminal output shown here]            │
└─────────────────────────────────────────────────┘
```

**Proposed:**
```
💻 ls -la → Terminal
```

Or even better - **hide completely** and only show in terminal panel.

### 7. **Status Indicators** - At-a-Glance Understanding

Use color-coded dots instead of badges:

```
🔧 3 tools • 245ms • ●●● (all green)
🔧 3 tools • 245ms • ●●○ (2 success, 1 pending)
🔧 3 tools • 245ms • ●●✗ (2 success, 1 failed)
```

### 8. **Contextual Actions** - Quick Operations

Add quick actions based on tool type:

```
📁 list_directory ./src • 57 items
   [📋 Copy paths] [🔍 Search here] [📂 Open in explorer]
```

```
🔍 search_files "useState" • 8 files
   [📋 Copy results] [🔄 Refine search] [📂 Open all]
```

## Implementation Plan

### Phase 1: Collapse by Default
- Add `collapsed` state (default: true)
- Show one-line summary when collapsed
- Click to expand

### Phase 2: Smart Summaries
- Add summary generators for each tool type
- Show counts, sizes, durations
- Hide raw output by default

### Phase 3: Grouping
- Detect sequential tool calls
- Group by category (file ops, terminal, search)
- Show as single expandable unit

### Phase 4: Micro-UI
- Add inline file chips
- Add inline search result chips
- Add inline terminal status

### Phase 5: Terminal Integration
- Hide terminal tools from chat
- Show only in terminal panel
- Add subtle indicator in chat ("→ Terminal")

## Code Changes

### 1. Update AgentAction Component

```typescript
// Add collapsed state
const [isCollapsed, setIsCollapsed] = useState(true);

// Add summary generator
const getSummary = () => {
  switch (toolCall.name) {
    case 'list_directory':
      return `${fileCount} items`;
    case 'search_files':
      return `${matchCount} matches in ${fileCount} files`;
    case 'read_file':
      return `${lineCount} lines`;
    case 'execute_command':
      return '→ Terminal';
    default:
      return 'View details';
  }
};

// Render collapsed view
if (isCollapsed) {
  return (
    <button onClick={() => setIsCollapsed(false)} className="...">
      <ToolIcon /> {getToolDisplayName()} • {getSummary()} • <StatusDot />
    </button>
  );
}
```

### 2. Add Tool Call Grouping

```typescript
// In MessageBubble.tsx
const groupToolCalls = (toolCalls: AgentToolCall[]) => {
  const groups: ToolCallGroup[] = [];
  let currentGroup: AgentToolCall[] = [];
  let currentCategory = '';
  
  for (const call of toolCalls) {
    const category = getToolCategory(call.name);
    
    if (category === currentCategory) {
      currentGroup.push(call);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ category: currentCategory, calls: currentGroup });
      }
      currentGroup = [call];
      currentCategory = category;
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push({ category: currentCategory, calls: currentGroup });
  }
  
  return groups;
};

const getToolCategory = (toolName: string) => {
  if (['list_directory', 'read_file', 'write_file'].includes(toolName)) {
    return 'file_operations';
  }
  if (['search_files'].includes(toolName)) {
    return 'search';
  }
  if (['execute_command', 'create_terminal'].includes(toolName)) {
    return 'terminal';
  }
  return 'other';
};
```

### 3. Add Micro-UI Components

```typescript
// FileChip.tsx
const FileChip = ({ file }: { file: string }) => (
  <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-xs">
    <FileIcon size={12} />
    {file}
  </button>
);

// In AgentAction.tsx
const renderMicroUI = () => {
  if (toolCall.name === 'list_directory' && parsedFiles) {
    return (
      <div className="flex flex-wrap gap-1">
        {parsedFiles.slice(0, 5).map(f => (
          <FileChip key={f.id} file={f.name} />
        ))}
        {parsedFiles.length > 5 && (
          <span className="text-xs text-text-secondary">
            +{parsedFiles.length - 5} more
          </span>
        )}
      </div>
    );
  }
  // ... other tool types
};
```

### 4. Hide Terminal Tools

```typescript
// In MessageBubble.tsx
const isTerminalTool = (toolName: string) => 
  ['create_terminal', 'execute_command', 'read_output', 'list_terminals', 'inspect_terminal']
    .includes(toolName);

// Filter out terminal tools
{message.toolCalls?.filter(tc => !isTerminalTool(tc.name)).map((toolCall, index) => (
  <AgentAction key={toolCall.id || index} toolCall={toolCall} result={result} />
))}

// Show terminal indicator if any terminal tools were used
{message.toolCalls?.some(tc => isTerminalTool(tc.name)) && (
  <div className="text-xs text-purple-400 flex items-center gap-1">
    <Terminal size={12} />
    Commands executed in terminal
  </div>
)}
```

## Visual Mockups

### Before (Current)
```
┌─────────────────────────────────────────────────┐
│ User: List files in src                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔧 List Directory                               │
│ ▾ Details                                       │
│ Arguments: { path: "./src" }                    │
│ Output:                                         │
│ [Large file listing UI - 300px height]          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔧 Search Files                                 │
│ ▾ Details                                       │
│ Arguments: { pattern: "useState" }              │
│ Output:                                         │
│ [Large search results UI - 250px height]        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔧 Read File                                    │
│ ▾ Details                                       │
│ Arguments: { path: "App.tsx" }                  │
│ Output:                                         │
│ [Large code display - 400px height]             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Assistant: I found 42 files in src...          │
└─────────────────────────────────────────────────┘

Total height: ~1200px
```

### After (Proposed)
```
┌─────────────────────────────────────────────────┐
│ User: List files in src                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔧 File Operations (3 tools) • 245ms • ●●●     │
│ ▸ Click to see details                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Assistant: I found 42 files in src...          │
└─────────────────────────────────────────────────┘

Total height: ~150px (87% reduction!)
```

## Configuration Options

Add user preferences:

```typescript
interface ToolCallDisplaySettings {
  defaultCollapsed: boolean;        // Default: true
  groupRelatedCalls: boolean;       // Default: true
  showTerminalToolsInChat: boolean; // Default: false
  summaryStyle: 'minimal' | 'detailed'; // Default: 'minimal'
  maxVisibleFiles: number;          // Default: 5
}
```

## Benefits Summary

1. **87% less vertical space** - Cleaner conversations
2. **Faster scanning** - See what happened at a glance
3. **Progressive disclosure** - Details when needed
4. **Less redundancy** - Terminal tools hidden
5. **Better grouping** - Related operations together
6. **Smarter summaries** - Show what matters
7. **Micro-UI** - Quick access to results
8. **User control** - Expand what's interesting

## Next Steps

1. Implement collapsed-by-default state
2. Add smart summary generators
3. Create micro-UI components
4. Add tool call grouping logic
5. Hide terminal tools from chat
6. Add user preferences
7. Test with real usage patterns
8. Gather user feedback
