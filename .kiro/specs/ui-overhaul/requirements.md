# UI Overhaul - Agent Mode & QuickActions Redesign

## Overview
Major UI restructuring to make agent mode the default and redesign QuickActions into full-featured panels.

## Requirements

### 1. Agent Mode as Default
- Agent mode should be ON by default when app starts
- User can toggle it off if needed
- Persist preference in settings

### 2. New AI Settings Panel
Move AI-related settings from UserPanel to dedicated AI Settings panel:
- **AI Logs Toggle**: Enable/disable agent logs in terminal
- **Advanced Mode Toggle**: Placeholder for future features
- **Codex-style Settings**: Import relevant settings from codex-cli
- **API Parameters**: Full transparency on all API parameters
- **Token Usage**: View usage for current month (default period)
- **API Key Configuration**: Moved from UserPanel

### 3. QuickAction UI Overhaul

#### 3.1 File Button → File Explorer Panel
- Opens terminal-style floating panel (reuse TerminalView layout)
- Tab-based interface with:
  - **Recently Searched** (default tab)
  - **Disk** tab
  - **Analysis** tab  
  - **Cleanup** tab
- Header buttons to switch between modes

#### 3.2 Space Button → Workflows Panel
- Opens terminal-style floating panel
- Contains editable, manageable prompt workflows
- Automatic prompting sequences
- Save/load workflow templates

#### 3.3 Cleanup Button → Terminal
- Replace Cleanup with Terminal button
- Remove old terminal button from input row
- Terminal opens the existing TerminalView

#### 3.4 Agents Button
- Keep as-is or integrate with agent mode toggle

### 4. Agent Behavior System
Make agent more persistent like Codex:
- Try multiple approaches before giving up
- Use shell commands proactively
- Handle permission errors gracefully
- Suggest alternatives when blocked

## File Changes Required

### New Files
- `components/panels/AISettingsPanel.tsx` - New AI settings modal
- `components/panels/FileExplorerPanel.tsx` - File explorer with tabs
- `components/panels/WorkflowsPanel.tsx` - Workflow automation UI
- `services/workflowService.ts` - Workflow management

### Modified Files
- `src/constants.ts` - Update QUICK_ACTIONS
- `components/chat/PromptArea.tsx` - New QuickAction handlers
- `components/chat/ChatInterface.tsx` - Default agent mode
- `components/settings/UserPanel.tsx` - Remove API config section
- `hooks/useAgentLogTab.ts` - Default to enabled
- `services/agentChatService.ts` - Enhanced behavior system

## Priority Order
1. Agent as default mode (quick change)
2. AI Settings Panel (move API config)
3. QuickAction → Terminal replacement
4. File Explorer Panel
5. Workflows Panel
6. Agent behavior enhancements
