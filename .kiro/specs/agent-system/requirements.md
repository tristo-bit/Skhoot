# Agent System - Requirements

## Overview

Create a comprehensive Agent management system for Skhoot that allows users to create, manage, and interact with AI agents through a visual UI panel and natural language commands. Agents are autonomous entities that can execute workflows, use tools, and participate in conversations.

## Goals

1. **Agent UI Panel**: Visual interface for managing agents (similar to Workflows panel)
2. **Agent Backend**: Fast Rust backend for agent storage and management
3. **Agent Builder**: Default agent that creates other agents via natural language
4. **Multi-Participant Chat**: Agents can send messages and interact in conversations
5. **Tool Integration**: Agents can be invoked via toolcalls from the chat AI

## User Stories

### As a User, I want to:

1. **View all my agents** in a dedicated panel with their status, last used time, and configuration
2. **Create agents using natural language** by typing "create an agent that reviews code" in chat
3. **See agents participate in conversations** alongside the AI and other agents
4. **Manage agent state** (enable/disable/pause agents) from the UI
5. **Configure agent permissions** (which tools they can use, which workflows they can execute)
6. **Invoke agents via toolcalls** so the chat AI can delegate tasks to specialized agents
7. **See agent execution status** (running/sleeping/failing) in real-time
8. **Edit agent configurations** including master prompts, workflows, and triggers

### As an Agent, I need to:

1. **Execute workflows** as instruction sets for complex tasks
2. **Use allowed tools** to interact with the system (file operations, terminal, search)
3. **Send messages to chat** to communicate with users and other agents
4. **Be triggered automatically** based on configured conditions (file changes, keywords, etc.)
5. **Maintain state** across multiple invocations
6. **Access context** from the conversation and file references

## Core Concepts

### Agent

An autonomous entity with:
- **Identity**: Name, description, tags
- **Behavior**: Master prompt (personality/instructions)
- **Capabilities**: Allowed tools, workflows
- **Triggers**: Conditions for automatic activation
- **State**: on/off/sleeping/failing
- **Metadata**: Created date, last used, usage count

### Agent Builder

A special default agent with 3 workflows:

1. **Agent Gatherer Workflow**
   - Asks questions to understand user needs
   - Creates `[id]-needs-discovery.md` document
   - Gathers constraints, goals, and requirements

2. **Agent Designer Workflow**
   - Reads `[id]-needs-discovery.md`
   - Designs automation strategy
   - Defines workflows, tools, and master prompt
   - Updates document with automation section

3. **Agent Builder Workflow**
   - Reads `[id]-needs-discovery.md`
   - Calls backend API to create agent
   - Saves agent to user's local storage
   - Confirms creation to user

### Multi-Participant Conversations

Conversations can include:
- **User**: Human input
- **Chat AI**: Main conversational agent
- **Agents**: Specialized agents responding to toolcalls or triggers
- **Future**: Multiple users (multiplayer chat)

Each participant has a visual indicator showing who's speaking.

## Technical Requirements

### Frontend

#### AgentsPanel Component
- Location: `components/panels/AgentsPanel.tsx`
- Based on: `WorkflowsPanel.tsx` design pattern
- Uses: `SecondaryPanel` component
- Tabs:
  - **Agents**: List all agents with status
  - **Running**: Show active agent executions
  - **Create**: Agent creation form

#### Agent Service
- Location: `services/agentService.ts`
- Similar to: `workflowService.ts`
- Responsibilities:
  - CRUD operations for agents
  - Agent execution management
  - Trigger checking
  - Event system for UI updates
  - Integration with workflow service

#### Integration Points
- **PromptArea**: "Agents" button already exists
- **App.tsx**: Add `isAgentsPanelOpen` state and handlers
- **ChatInterface**: Handle agent messages and toolcalls
- **AgentChatService**: Add agent invocation toolcalls

### Backend

#### Rust API Endpoints
- Location: `backend/src/api/agents.rs`
- Endpoints:
  - `POST /api/agents` - Create agent
  - `GET /api/agents` - List agents
  - `GET /api/agents/:id` - Get agent details
  - `PUT /api/agents/:id` - Update agent
  - `DELETE /api/agents/:id` - Delete agent
  - `POST /api/agents/:id/execute` - Execute agent
  - `GET /api/agents/:id/status` - Get execution status

#### Storage
- Location: User's local filesystem via Tauri
- Format: JSON files in `.skhoot/agents/` directory
- Structure:
  ```
  .skhoot/
    agents/
      agent-id-1.json
      agent-id-2.json
      ...
  ```

### Data Schema

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  
  // Behavior
  masterPrompt: string;
  workflows: string[]; // Workflow IDs
  
  // Capabilities
  allowedTools: string[];
  allowedWorkflows: string[];
  
  // Triggers
  trigger?: TriggerConfig;
  
  // State
  state: 'on' | 'off' | 'sleeping' | 'failing';
  isDefault: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  usageCount: number;
  
  // Configuration
  config: {
    maxConcurrentExecutions: number;
    timeoutSeconds: number;
    retryOnFailure: boolean;
    notifyOnComplete: boolean;
  };
}

interface TriggerConfig {
  type: 'manual' | 'keyword' | 'file_event' | 'schedule' | 'toolcall';
  keywords?: string[];
  filePatterns?: string[];
  schedule?: string; // cron expression
  autoActivate: boolean;
}

interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  currentWorkflowId?: string;
  context: Record<string, any>;
  messages: AgentMessage[];
  error?: string;
}

interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  type: 'input' | 'output' | 'system';
}
```

## Functional Requirements

### FR-1: Agent Panel UI

**Must Have:**
- List view showing all agents with status indicators
- Search/filter by name, tags, state
- Create new agent button
- Agent detail view with edit capabilities
- Running executions view
- Visual state indicators (on/off/sleeping/failing)

**Should Have:**
- Agent categories/grouping
- Quick actions (run, edit, delete)
- Usage statistics
- Last execution details

### FR-2: Agent Creation via Natural Language

**Must Have:**
- Detect "create agent" intent in chat
- Invoke Agent Builder via toolcall
- Execute 3-workflow sequence (Gatherer → Designer → Builder)
- Create `[id]-needs-discovery.md` document
- Call backend API to save agent
- Show new agent in panel

**Should Have:**
- Interactive forms for gathering requirements
- Preview agent configuration before creation
- Validation of agent configuration
- Confirmation step

### FR-3: Agent Execution

**Must Have:**
- Execute agent workflows in sequence
- Pass context between workflows
- Handle tool calls from agent
- Send agent messages to chat
- Track execution state
- Handle errors and retries

**Should Have:**
- Parallel workflow execution
- Workflow branching based on conditions
- Execution history
- Performance metrics

### FR-4: Multi-Participant Chat

**Must Have:**
- Visual indicators for different participants (User, AI, Agent)
- Agent messages rendered in chat
- Agent responses to toolcalls
- Message threading/context

**Should Have:**
- Agent avatars/icons
- Typing indicators for agents
- Message reactions
- Conversation branching

### FR-5: Tool Integration

**Must Have:**
- Agent toolcall definition for chat AI
- Tool permission system
- Tool execution tracking
- Error handling for tool failures

**Should Have:**
- Tool usage analytics
- Tool rate limiting
- Custom tool definitions
- Tool chaining

## Non-Functional Requirements

### Performance
- Agent list should load in <100ms
- Agent execution should start in <200ms
- UI should remain responsive during agent execution
- Support 100+ agents without performance degradation

### Reliability
- Agent state should persist across app restarts
- Failed executions should not crash the app
- Agents should handle tool failures gracefully
- Execution state should be recoverable

### Usability
- Agent creation should take <2 minutes
- Panel should follow existing design system
- Error messages should be clear and actionable
- Agent status should be immediately visible

### Security
- Agents should only access allowed tools
- Agent prompts should be sandboxed
- File access should be restricted to workspace
- API keys should not be exposed to agents

## Success Criteria

1. ✅ User can create an agent using natural language in <2 minutes
2. ✅ Agent panel displays all agents with correct status
3. ✅ Agents can execute workflows and use tools
4. ✅ Agent messages appear in chat with visual distinction
5. ✅ Chat AI can invoke agents via toolcalls
6. ✅ Agent state persists across app restarts
7. ✅ Agent Builder successfully creates functional agents
8. ✅ UI remains responsive during agent execution

## Out of Scope (Future Enhancements)

- Agent marketplace/sharing
- Agent collaboration (agents working together)
- Agent learning/adaptation
- Visual workflow editor for agents
- Agent templates library
- Agent performance optimization
- Agent debugging tools
- Agent versioning
- Multi-user agent permissions

## Dependencies

- Existing workflow system (`workflowService.ts`)
- Existing tool system (`agentTools/`)
- Backend API infrastructure
- Tauri file system access
- Chat interface and message rendering

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent execution blocks UI | High | Use async execution with progress indicators |
| Agent infinite loops | High | Implement timeouts and execution limits |
| Agent storage conflicts | Medium | Use file locking and atomic writes |
| Complex agent creation UX | Medium | Provide guided workflow with Agent Builder |
| Tool permission confusion | Medium | Clear UI for tool selection and warnings |
| Agent state inconsistency | High | Implement state validation and recovery |

## Open Questions

1. Should agents have access to conversation history?
2. How should agent-to-agent communication work?
3. Should agents be able to create other agents?
4. What's the maximum execution time for an agent?
5. How should agent errors be displayed to users?
6. Should agents have different permission levels?
7. How should agent updates affect running executions?

## Next Steps

1. Review and approve requirements
2. Create detailed design document
3. Break down into implementation tasks
4. Implement backend API
5. Implement frontend service
6. Create AgentsPanel UI
7. Implement Agent Builder
8. Integration testing
9. Documentation
