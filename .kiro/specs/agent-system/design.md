# Agent System - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AgentsPanel  │  │ ChatInterface│  │  PromptArea  │      │
│  │              │  │              │  │              │      │
│  │ - List       │  │ - Messages   │  │ - Quick      │      │
│  │ - Running    │  │ - Toolcalls  │  │   Actions    │      │
│  │ - Create     │  │ - Rendering  │  │ - Agents Btn │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                 │
│         └──────────┬───────┘                                 │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │   agentService.ts   │                             │
│         │                     │                             │
│         │ - CRUD operations   │                             │
│         │ - Execution mgmt    │                             │
│         │ - Trigger checking  │                             │
│         │ - Event system      │                             │
│         └──────────┬──────────┘                             │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    Rust Backend                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│         ┌──────────────────────┐                             │
│         │  /api/agents/*       │                             │
│         │                      │                             │
│         │ - POST /agents       │                             │
│         │ - GET /agents        │                             │
│         │ - PUT /agents/:id    │                             │
│         │ - DELETE /agents/:id │                             │
│         │ - POST /execute      │                             │
│         └──────────┬───────────┘                             │
│                    │                                         │
│         ┌──────────▼───────────┐                             │
│         │  Agent Storage       │                             │
│         │                      │                             │
│         │  .skhoot/agents/     │                             │
│         │  - agent-1.json      │                             │
│         │  - agent-2.json      │                             │
│         └──────────────────────┘                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. AgentsPanel Component

**Location**: `components/panels/AgentsPanel.tsx`

**Structure**:
```tsx
<SecondaryPanel>
  <Tabs>
    <Tab id="agents">
      <AgentList>
        {agents.map(agent => (
          <AgentListItem
            agent={agent}
            onSelect={handleSelect}
            onRun={handleRun}
            onToggleState={handleToggleState}
            onDelete={handleDelete}
          />
        ))}
      </AgentList>
      <AgentDetail
        agent={selectedAgent}
        isEditing={isEditing}
        onEdit={handleEdit}
        onSave={handleSave}
      />
    </Tab>
    
    <Tab id="running">
      <RunningExecutions
        executions={activeExecutions}
        onCancel={handleCancel}
      />
    </Tab>
    
    <Tab id="create">
      <AgentCreator
        onSave={handleCreate}
        onCancel={handleCancelCreate}
      />
    </Tab>
  </Tabs>
</SecondaryPanel>
```

**Key Features**:
- Split view: List (1/3) + Detail (2/3)
- State indicators with color coding
- Search/filter bar
- Quick actions (run, edit, delete)
- Collapsible sections for configuration

**State Management**:
```typescript
const [agents, setAgents] = useState<Agent[]>([]);
const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
const [activeExecutions, setActiveExecutions] = useState<AgentExecution[]>([]);
const [isEditing, setIsEditing] = useState(false);
const [activeTab, setActiveTab] = useState<'agents' | 'running' | 'create'>('agents');
```

### 2. Agent Service

**Location**: `services/agentService.ts`

**Class Structure**:
```typescript
class AgentService {
  private agents: Map<string, Agent>;
  private executions: Map<string, AgentExecution>;
  private eventListeners: Map<string, Set<Function>>;
  
  // CRUD Operations
  async list(): Promise<Agent[]>
  async get(id: string): Promise<Agent | undefined>
  async create(request: CreateAgentRequest): Promise<Agent>
  async update(id: string, updates: Partial<Agent>): Promise<Agent>
  async delete(id: string): Promise<boolean>
  
  // Execution
  async execute(agentId: string, context?: Record<string, any>): Promise<AgentExecution>
  async cancelExecution(executionId: string): Promise<void>
  getActiveExecutions(): AgentExecution[]
  
  // Triggers
  async checkMessageTriggers(message: string): Promise<Agent[]>
  async checkFileTriggers(filePath: string, event: string): Promise<Agent[]>
  
  // State Management
  async setState(agentId: string, state: AgentState): Promise<void>
  async toggleState(agentId: string): Promise<void>
  
  // Tool Integration
  getToolcallDefinition(agentId: string): ToolDefinition
  async executeViaToolcall(agentId: string, args: any): Promise<any>
  
  // Event System
  on(event: string, listener: Function): () => void
  private emit(event: string, data: any): void
}
```

**Events**:
- `agent_created` - New agent created
- `agent_updated` - Agent configuration changed
- `agent_deleted` - Agent removed
- `agent_state_changed` - Agent state toggled
- `execution_started` - Agent execution began
- `execution_completed` - Agent execution finished
- `execution_failed` - Agent execution error
- `agent_message` - Agent sent a message

### 3. Backend API

**Location**: `backend/src/api/agents.rs`

**Endpoints**:

#### POST /api/agents
Create a new agent
```rust
#[derive(Deserialize)]
struct CreateAgentRequest {
    name: String,
    description: String,
    tags: Vec<String>,
    master_prompt: String,
    workflows: Vec<String>,
    allowed_tools: Vec<String>,
    trigger: Option<TriggerConfig>,
    config: AgentConfig,
}

async fn create_agent(
    Json(request): Json<CreateAgentRequest>
) -> Result<Json<Agent>, ApiError>
```

#### GET /api/agents
List all agents
```rust
#[derive(Deserialize)]
struct ListAgentsQuery {
    state: Option<String>,
    tags: Option<String>,
    search: Option<String>,
}

async fn list_agents(
    Query(query): Query<ListAgentsQuery>
) -> Result<Json<Vec<Agent>>, ApiError>
```

#### GET /api/agents/:id
Get agent details
```rust
async fn get_agent(
    Path(id): Path<String>
) -> Result<Json<Agent>, ApiError>
```

#### PUT /api/agents/:id
Update agent
```rust
async fn update_agent(
    Path(id): Path<String>,
    Json(updates): Json<UpdateAgentRequest>
) -> Result<Json<Agent>, ApiError>
```

#### DELETE /api/agents/:id
Delete agent
```rust
async fn delete_agent(
    Path(id): Path<String>
) -> Result<StatusCode, ApiError>
```

#### POST /api/agents/:id/execute
Execute agent
```rust
#[derive(Deserialize)]
struct ExecuteAgentRequest {
    context: Option<HashMap<String, serde_json::Value>>,
    message: Option<String>,
}

async fn execute_agent(
    Path(id): Path<String>,
    Json(request): Json<ExecuteAgentRequest>
) -> Result<Json<AgentExecution>, ApiError>
```

**Storage Implementation**:
```rust
struct AgentStorage {
    base_path: PathBuf,
}

impl AgentStorage {
    fn new() -> Result<Self, Error> {
        let base_path = get_app_data_dir()?.join("agents");
        fs::create_dir_all(&base_path)?;
        Ok(Self { base_path })
    }
    
    async fn save(&self, agent: &Agent) -> Result<(), Error> {
        let path = self.base_path.join(format!("{}.json", agent.id));
        let json = serde_json::to_string_pretty(agent)?;
        tokio::fs::write(path, json).await?;
        Ok(())
    }
    
    async fn load(&self, id: &str) -> Result<Agent, Error> {
        let path = self.base_path.join(format!("{}.json", id));
        let json = tokio::fs::read_to_string(path).await?;
        let agent = serde_json::from_str(&json)?;
        Ok(agent)
    }
    
    async fn list(&self) -> Result<Vec<Agent>, Error> {
        let mut agents = Vec::new();
        let mut entries = tokio::fs::read_dir(&self.base_path).await?;
        
        while let Some(entry) = entries.next_entry().await? {
            if entry.path().extension() == Some(OsStr::new("json")) {
                let json = tokio::fs::read_to_string(entry.path()).await?;
                if let Ok(agent) = serde_json::from_str(&json) {
                    agents.push(agent);
                }
            }
        }
        
        Ok(agents)
    }
    
    async fn delete(&self, id: &str) -> Result<(), Error> {
        let path = self.base_path.join(format!("{}.json", id));
        tokio::fs::remove_file(path).await?;
        Ok(())
    }
}
```

## Agent Builder Design

### Default Agent: "Agent Builder"

**Purpose**: Create new agents through natural language conversation

**Configuration**:
```typescript
{
  id: 'default-agent-builder',
  name: 'Agent Builder',
  description: 'Creates new agents through guided conversation',
  tags: ['default', 'builder', 'meta'],
  masterPrompt: `You are the Agent Builder, responsible for creating new agents.
Your goal is to understand what the user needs and create a functional agent.
Follow the workflows in sequence: Gatherer → Designer → Builder.`,
  workflows: [
    'agent-gatherer-workflow',
    'agent-designer-workflow',
    'agent-builder-workflow'
  ],
  allowedTools: [
    'write_file',
    'read_file',
    'create_agent' // Special toolcall
  ],
  trigger: {
    type: 'keyword',
    keywords: ['create agent', 'new agent', 'build agent', 'make agent'],
    autoActivate: true
  },
  state: 'on',
  isDefault: true
}
```

### Workflow 1: Agent Gatherer

**Purpose**: Discover user needs through questions

**Steps**:
1. **Greet & Understand**
   - Ask: "What should this agent do?"
   - Ask: "What triggers should activate it?"
   - Ask: "What tools should it have access to?"

2. **Gather Constraints**
   - Ask: "Any limitations or restrictions?"
   - Ask: "How should it handle errors?"
   - Ask: "Should it notify you when complete?"

3. **Create Discovery Document**
   - Write to: `.skhoot/agent-discovery/[timestamp]-needs.md`
   - Include all gathered information
   - Format as structured markdown

**Output**: `[id]-needs-discovery.md` file

### Workflow 2: Agent Designer

**Purpose**: Design automation strategy from needs

**Steps**:
1. **Read Discovery Document**
   - Load `[id]-needs-discovery.md`
   - Parse requirements and constraints

2. **Design Workflows**
   - Identify required workflows
   - Define workflow steps
   - Determine tool requirements

3. **Create Master Prompt**
   - Write agent personality/instructions
   - Include behavior guidelines
   - Define success criteria

4. **Update Document**
   - Add "Automation Design" section
   - Include workflow definitions
   - Add master prompt
   - List required tools

**Output**: Updated `[id]-needs-discovery.md` with automation section

### Workflow 3: Agent Builder

**Purpose**: Create agent via backend API

**Steps**:
1. **Read Final Document**
   - Load complete `[id]-needs-discovery.md`
   - Extract all configuration

2. **Validate Configuration**
   - Check required fields
   - Validate tool names
   - Verify workflow references

3. **Call Backend API**
   - Use `create_agent` toolcall
   - Pass complete configuration
   - Handle errors

4. **Confirm Creation**
   - Notify user of success
   - Show agent details
   - Suggest next steps

**Output**: New agent created and saved

## Multi-Participant Chat Design

### Message Structure

```typescript
interface ChatMessage {
  id: string;
  content: string;
  timestamp: number;
  participant: {
    type: 'user' | 'ai' | 'agent';
    id?: string; // Agent ID if type is 'agent'
    name: string;
    avatar?: string;
  };
  metadata?: {
    agentExecutionId?: string;
    workflowId?: string;
    toolCalls?: ToolCall[];
  };
}
```

### Visual Design

**User Message**:
```
┌─────────────────────────────────────┐
│ 👤 You                              │
│ Create an agent that reviews code   │
└─────────────────────────────────────┘
```

**AI Message**:
```
┌─────────────────────────────────────┐
│ 🤖 Skhoot AI                        │
│ I'll help you create that agent...  │
└─────────────────────────────────────┘
```

**Agent Message**:
```
┌─────────────────────────────────────┐
│ 🔧 Agent Builder                    │
│ What should this agent do?          │
└─────────────────────────────────────┘
```

### Rendering Component

```tsx
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const getParticipantColor = () => {
    switch (message.participant.type) {
      case 'user': return 'blue';
      case 'ai': return 'purple';
      case 'agent': return 'emerald';
    }
  };
  
  const getParticipantIcon = () => {
    switch (message.participant.type) {
      case 'user': return <User size={16} />;
      case 'ai': return <Bot size={16} />;
      case 'agent': return <Zap size={16} />;
    }
  };
  
  return (
    <div className={`message-bubble ${message.participant.type}`}>
      <div className="participant-header">
        {getParticipantIcon()}
        <span>{message.participant.name}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
      {message.metadata?.agentExecutionId && (
        <div className="execution-badge">
          Running workflow...
        </div>
      )}
    </div>
  );
};
```

## Tool Integration Design

### Agent Toolcall Definition

```typescript
const agentToolcalls = {
  invoke_agent: {
    name: 'invoke_agent',
    description: 'Invoke a specialized agent to handle a specific task',
    parameters: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'ID of the agent to invoke'
        },
        message: {
          type: 'string',
          description: 'Message or task for the agent'
        },
        context: {
          type: 'object',
          description: 'Additional context for the agent'
        }
      },
      required: ['agent_id', 'message']
    }
  },
  
  create_agent: {
    name: 'create_agent',
    description: 'Create a new agent (only available to Agent Builder)',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        master_prompt: { type: 'string' },
        workflows: { type: 'array', items: { type: 'string' } },
        allowed_tools: { type: 'array', items: { type: 'string' } },
        trigger: { type: 'object' }
      },
      required: ['name', 'description', 'master_prompt']
    }
  }
};
```

### Tool Execution Flow

```
1. Chat AI receives user message
2. AI decides to invoke agent via toolcall
3. agentChatService.executeWithTools() processes toolcall
4. agentService.executeViaToolcall() starts agent execution
5. Agent executes workflows
6. Agent sends messages to chat
7. Agent completes and returns result
8. Result shown in chat as tool output
```

## State Management

### Agent States

```typescript
type AgentState = 'on' | 'off' | 'sleeping' | 'failing';

// State Transitions:
// on → off (user disables)
// on → sleeping (no activity for 24h)
// on → failing (3+ consecutive failures)
// off → on (user enables)
// sleeping → on (user activity or trigger)
// failing → on (user fixes and re-enables)
```

### State Indicators

```tsx
const StateIndicator: React.FC<{ state: AgentState }> = ({ state }) => {
  const config = {
    on: { color: 'emerald', icon: <CheckCircle />, label: 'Active' },
    off: { color: 'gray', icon: <Circle />, label: 'Disabled' },
    sleeping: { color: 'blue', icon: <Moon />, label: 'Sleeping' },
    failing: { color: 'red', icon: <AlertCircle />, label: 'Failing' }
  };
  
  const c = config[state];
  return (
    <div className={`state-indicator ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
    </div>
  );
};
```

## Error Handling

### Agent Execution Errors

```typescript
class AgentExecutionError extends Error {
  constructor(
    public agentId: string,
    public executionId: string,
    public step: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
  }
}

// Error Recovery Strategy:
async function handleExecutionError(error: AgentExecutionError) {
  // 1. Log error
  console.error('[AgentService] Execution error:', error);
  
  // 2. Update agent state
  if (shouldMarkAsFailing(error)) {
    await agentService.setState(error.agentId, 'failing');
  }
  
  // 3. Notify user
  await nativeNotifications.error(
    'Agent Execution Failed',
    `${error.agentId}: ${error.message}`
  );
  
  // 4. Retry if configured
  if (agent.config.retryOnFailure) {
    await scheduleRetry(error.executionId);
  }
}
```

### Tool Permission Errors

```typescript
class ToolPermissionError extends Error {
  constructor(
    public agentId: string,
    public toolName: string
  ) {
    super(`Agent ${agentId} not allowed to use tool: ${toolName}`);
  }
}

// Permission Check:
function checkToolPermission(agent: Agent, toolName: string): boolean {
  if (!agent.allowedTools.includes(toolName)) {
    throw new ToolPermissionError(agent.id, toolName);
  }
  return true;
}
```

## Performance Considerations

### Lazy Loading
- Load agent list on panel open
- Load agent details on selection
- Stream execution logs

### Caching
- Cache agent list for 30 seconds
- Cache workflow definitions
- Invalidate on updates

### Optimization
- Debounce search/filter
- Virtual scrolling for large agent lists
- Memoize expensive computations
- Use React.memo for list items

## Security Considerations

### Tool Access Control
- Whitelist approach for tools
- Validate tool names against registry
- Audit tool usage
- Rate limiting per agent

### Prompt Injection Protection
- Sanitize user inputs
- Validate workflow prompts
- Escape special characters
- Limit prompt length

### File System Access
- Restrict to workspace directory
- Validate file paths
- No access to system files
- Audit file operations

## Testing Strategy

### Unit Tests
- Agent service CRUD operations
- Trigger checking logic
- State transitions
- Tool permission checks

### Integration Tests
- Agent execution flow
- Workflow integration
- Backend API calls
- File storage operations

### E2E Tests
- Create agent via UI
- Create agent via natural language
- Execute agent and verify output
- Multi-participant chat flow

## Migration Strategy

### Phase 1: Backend (Week 1)
- Implement Rust API endpoints
- Create storage layer
- Add tests

### Phase 2: Frontend Service (Week 1-2)
- Implement agentService.ts
- Add event system
- Integrate with workflows

### Phase 3: UI (Week 2)
- Create AgentsPanel component
- Add to App.tsx
- Wire up quick action button

### Phase 4: Agent Builder (Week 2-3)
- Create 3 workflows
- Implement toolcalls
- Test end-to-end

### Phase 5: Multi-Participant Chat (Week 3)
- Update message rendering
- Add participant indicators
- Test agent messages

### Phase 6: Polish & Testing (Week 3-4)
- Error handling
- Performance optimization
- Documentation
- User testing

## Documentation Requirements

### User Documentation
- How to create an agent
- How to configure triggers
- How to manage agent state
- Troubleshooting guide

### Developer Documentation
- API reference
- Service architecture
- Adding new tools
- Extending agent capabilities

### Code Documentation
- JSDoc for all public methods
- Inline comments for complex logic
- README for agent system
- Architecture diagrams
