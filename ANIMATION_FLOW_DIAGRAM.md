# Animation Flow Diagram

## Complete Animation Lifecycle

```
User sends message: "List all files in this directory"
    ↓
ChatInterface.handleSend()
    ↓
setSearchType(getSearchType(messageText))
    → Detects "list" keyword → searchType = 'files'
    ↓
setIsLoading(true)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: CONNECTION (No toolName yet)                       │
├─────────────────────────────────────────────────────────────┤
│ Status: "Connecting to Gemini..."                           │
│ searchType: 'files'                                          │
│ toolName: null                                               │
│                                                              │
│ SearchingIndicator.getAnimation():                           │
│   Priority 1: toolName? → NO                                │
│   Priority 2: searchType === 'files'? → YES                 │
│   → Returns: AnimationSearchDiscovery (Purple)              │
│                                                              │
│ Display:                                                     │
│   [Purple Swarm Animation]                                  │
│   "Connecting to Gemini..."                                 │
└─────────────────────────────────────────────────────────────┘
    ↓
agentChatService.executeWithTools()
    ↓
AI decides to use 'list_directory' tool
    ↓
onToolStart({ name: 'list_directory', ... })
    ↓
setCurrentToolName('list_directory')
    ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: TOOL EXECUTION (toolName available)                │
├─────────────────────────────────────────────────────────────┤
│ Status: "Executing list_directory..."                       │
│ searchType: 'files'                                          │
│ toolName: 'list_directory'                                   │
│                                                              │
│ SearchingIndicator.getAnimation():                           │
│   Priority 1: toolName === 'list_directory'? → YES          │
│   → Returns: AnimationSearchDiscovery (Purple)              │
│                                                              │
│ Display:                                                     │
│   [Purple Swarm Animation] ← SAME ANIMATION!                │
│   "Executing list_directory..."                             │
└─────────────────────────────────────────────────────────────┘
    ↓
Tool execution completes
    ↓
onToolComplete({ success: true, ... })
    ↓
setCurrentToolName(null)
    ↓
setIsLoading(false)
    ↓
Animation clears, results display
```

## Animation Consistency Examples

### Example 1: File Read Operation

```
Message: "Read the README.md file"
    ↓
searchType: 'files' (detected from "read" keyword)
    ↓
PHASE 1 (Connecting):
  searchType → 'files' → Purple Search Animation
    ↓
PHASE 2 (Executing):
  toolName → 'read_file' → Blue File Operations Animation
    ↓
❌ PROBLEM: Animation switches from Purple to Blue!
```

**Solution**: The `searchType` detection needs improvement, OR we accept that generic "files" type defaults to search animation until the specific tool is known.

### Example 2: Web Search

```
Message: "Search the web for React tutorials"
    ↓
searchType: null (no file/disk/cleanup keywords)
    ↓
PHASE 1 (Connecting):
  status → "Connecting to Gemini..."
  No searchType, no toolName
  → Fallback to Purple Search Animation
    ↓
PHASE 2 (Executing):
  toolName → 'web_search' → Cyan Web Access Animation
    ↓
❌ PROBLEM: Animation switches from Purple to Cyan!
```

**Solution**: Need to detect web search intent from message and set appropriate searchType.

### Example 3: Shell Command

```
Message: "Run npm install"
    ↓
searchType: null (no matching keywords)
    ↓
PHASE 1 (Connecting):
  status → "Connecting to Gemini..."
  → Fallback to Purple Search Animation
    ↓
PHASE 2 (Executing):
  toolName → 'shell' → Green Command Execution Animation
    ↓
❌ PROBLEM: Animation switches from Purple to Green!
```

**Solution**: Need to detect command execution intent from message.

## Improved Solution: Enhanced Message Analysis

To achieve true animation consistency, we need to improve the `getSearchType()` function in `ChatInterface.tsx` to detect more intent types:

```typescript
const getSearchType = (text: string): 'files' | 'messages' | 'disk' | 'cleanup' | 'web' | 'command' | 'agent' | null => {
  const lower = text.toLowerCase();
  
  // Web search keywords
  if (lower.includes('search the web') || lower.includes('google') || lower.includes('look up online')) {
    return 'web';
  }
  
  // Command execution keywords
  if (lower.includes('run ') || lower.includes('execute ') || lower.includes('npm ') || lower.includes('git ')) {
    return 'command';
  }
  
  // Agent keywords
  if (lower.includes('invoke agent') || lower.includes('create agent') || lower.includes('list agents')) {
    return 'agent';
  }
  
  // File operations (existing logic)
  // ...
  
  return null;
};
```

Then update `SearchingIndicator` to map these new types to animations:

```typescript
if (type === 'web') {
  return { component: <AnimationWebAccess isProcessing={true} />, category: 'web' };
}
if (type === 'command') {
  return { component: <AnimationCommandExecution isProcessing={true} />, category: 'command' };
}
if (type === 'agent') {
  return { component: <AnimationAgentOperations isProcessing={true} />, category: 'agent' };
}
```

## Current State vs Ideal State

### Current State ✅
- Animation switches are reduced
- Tool-specific animations work correctly once tool name is known
- Fallback logic prevents crashes

### Ideal State 🎯
- **Zero animation switches** from connection to completion
- Message intent detection predicts correct animation category
- Consistent visual experience throughout entire process

## Implementation Priority

1. ✅ **DONE**: Tool name tracking and animation mapping
2. ✅ **DONE**: Priority-based animation detection
3. ✅ **DONE**: Status text handling
4. 🔄 **IN PROGRESS**: Enhanced message intent detection
5. ⏳ **TODO**: Expand searchType to include 'web', 'command', 'agent'
6. ⏳ **TODO**: Update getSearchType() with comprehensive keyword detection
