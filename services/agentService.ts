/**
 * Agent Service
 * 
 * Manages agent definitions, execution, and triggers.
 * Provides autonomous agent system with support for:
 * - Agent creation and management
 * - Workflow execution
 * - Tool integration
 * - Multi-participant conversations
 */

const BACKEND_URL = 'http://localhost:3001';

// ============================================================================
// Types & Interfaces
// ============================================================================

import { AgentToolCall, ToolResult } from './agent/types';

export interface AgentStatus {
  state: 'ready' | 'pending' | 'error' | 'inactive';
  provider: string;
  model: string;
  messageCount: number;
}

export interface AgentEventData {
  sessionId: string;
  message?: AgentMessage;
  toolCall?: AgentToolCall;
  toolResult?: ToolResult;
  error?: string;
}

export type AgentState = 'on' | 'off' | 'sleeping' | 'failing';
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type MessageType = 'input' | 'output' | 'system';

export interface TriggerConfig {
  type: 'manual' | 'keyword' | 'file_event' | 'schedule' | 'toolcall';
  keywords?: string[];
  patterns?: string[];
  cron?: string;
  autoActivate: boolean;
}

export interface AgentConfig {
  maxConcurrentExecutions: number;
  timeoutSeconds: number;
  retryOnFailure: boolean;
  notifyOnComplete: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  
  // Behavior
  masterPrompt: string;
  workflows: string[];
  
  // Capabilities
  allowedTools: string[];
  allowedWorkflows: string[];
  
  // Triggers
  trigger?: TriggerConfig;
  
  // State
  state: AgentState;
  isDefault: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  usageCount: number;
  
  // Configuration
  config: AgentConfig;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: ExecutionStatus;
  startedAt: number;
  completedAt?: number;
  currentWorkflowId?: string;
  context: Record<string, any>;
  messages: AgentMessage[];
  error?: string;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  /** Gemini-specific thought process */
  thought?: string;
  timestamp: number;
  type: MessageType;
}

export interface CreateAgentRequest {
  name: string;
  description: string;
  tags?: string[];
  masterPrompt: string;
  workflows?: string[];
  allowedTools?: string[];
  allowedWorkflows?: string[];
  trigger?: TriggerConfig;
  config?: AgentConfig;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  tags?: string[];
  masterPrompt?: string;
  workflows?: string[];
  allowedTools?: string[];
  allowedWorkflows?: string[];
  trigger?: TriggerConfig;
  state?: AgentState;
  config?: AgentConfig;
}

export interface ExecuteAgentRequest {
  context?: Record<string, any>;
  message?: string;
}

// ============================================================================
// Session Management
// ============================================================================

export interface AgentSessionOptions {
  workspaceRoot?: string;
  context?: Record<string, any>;
}

export interface AgentSession {
  id: string;
  agentId?: string;
  options: AgentSessionOptions;
  createdAt: number;
  lastActivityAt: number;
}

// ============================================================================
// Agent Service Class
// ============================================================================

class AgentService {
  private agents: Map<string, Agent> = new Map();
  private executions: Map<string, AgentExecution> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Load agents on initialization
    this.loadPromise = this.loadAgents().then(() => {
      // Initialize default agents if they don't exist
      this.initializeDefaultAgents();
    });
  }

  async getStatus(sessionId: string): Promise<AgentStatus | null> {
    const execution = this.executions.get(sessionId);
    if (!execution) {
      // Check if it's a generic session
      const session = this.sessions.get(sessionId);
      if (session) {
        return {
          state: 'ready',
          provider: 'system',
          model: 'default',
          messageCount: 0
        };
      }
      return null;
    }

    // Determine state
    let state: AgentStatus['state'] = 'pending';
    if (execution.status === 'completed') state = 'ready';
    if (execution.status === 'failed') state = 'error';
    if (execution.status === 'cancelled') state = 'inactive';
    if (execution.status === 'running') state = 'pending';

    return {
      state,
      provider: execution.context?.provider || 'auto',
      model: execution.context?.model || 'default',
      messageCount: execution.messages.length
    };
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  async createSession(sessionId: string, options?: AgentSessionOptions): Promise<void> {
    if (this.sessions.has(sessionId)) {
      console.log('[AgentService] Session already exists:', sessionId);
      return;
    }

    const session: AgentSession = {
      id: sessionId,
      options: options || {},
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.emit('session_created', { session });
    console.log('[AgentService] Created session:', sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn('[AgentService] Session not found:', sessionId);
      return;
    }

    this.sessions.delete(sessionId);
    this.emit('session_closed', { sessionId });
    console.log('[AgentService] Closed session:', sessionId);
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  async list(): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.agents.values());
  }

  async listByState(state: AgentState): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.agents.values()).filter(a => a.state === state);
  }

  async listByTags(tags: string[]): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.agents.values())
      .filter(a => tags.some(t => a.tags.includes(t)));
  }

  async get(id: string): Promise<Agent | undefined> {
    await this.ensureLoaded();
    
    // Try cache first
    if (this.agents.has(id)) {
      return this.agents.get(id);
    }
    
    // Fetch from backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agents/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to get agent: ${response.statusText}`);
      }
      
      const agent: Agent = await response.json();
      this.agents.set(id, agent);
      return agent;
    } catch (error) {
      console.error('[AgentService] Failed to get agent:', error);
      return undefined;
    }
  }

  // Synchronous getter for UI components
  getSync(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  async create(request: CreateAgentRequest): Promise<Agent> {
    try {
      // Convert camelCase to snake_case for backend
      const backendRequest = {
        name: request.name,
        description: request.description,
        tags: request.tags || [],
        master_prompt: request.masterPrompt,
        workflows: request.workflows || [],
        allowed_tools: request.allowedTools || [],
        allowed_workflows: request.allowedWorkflows || [],
        trigger: request.trigger ? this.convertTriggerToBackend(request.trigger) : undefined,
        config: request.config || undefined,
      };

      const response = await fetch(`${BACKEND_URL}/api/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendRequest),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create agent: ${response.statusText}`);
      }
      
      const agent: Agent = await response.json();
      this.agents.set(agent.id, agent);
      this.emit('agent_created', { agent });
      
      console.log('[AgentService] Created agent:', agent.name);
      return agent;
    } catch (error) {
      console.error('[AgentService] Failed to create agent:', error);
      throw error;
    }
  }

  async update(id: string, updates: UpdateAgentRequest): Promise<Agent | undefined> {
    try {
      // Convert camelCase to snake_case for backend
      const backendUpdates: any = {};
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.description !== undefined) backendUpdates.description = updates.description;
      if (updates.tags !== undefined) backendUpdates.tags = updates.tags;
      if (updates.masterPrompt !== undefined) backendUpdates.master_prompt = updates.masterPrompt;
      if (updates.workflows !== undefined) backendUpdates.workflows = updates.workflows;
      if (updates.allowedTools !== undefined) backendUpdates.allowed_tools = updates.allowedTools;
      if (updates.allowedWorkflows !== undefined) backendUpdates.allowed_workflows = updates.allowedWorkflows;
      if (updates.trigger !== undefined) backendUpdates.trigger = this.convertTriggerToBackend(updates.trigger);
      if (updates.state !== undefined) backendUpdates.state = updates.state;
      if (updates.config !== undefined) backendUpdates.config = updates.config;

      const response = await fetch(`${BACKEND_URL}/api/v1/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendUpdates),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to update agent: ${response.statusText}`);
      }
      
      const agent: Agent = await response.json();
      this.agents.set(id, agent);
      this.emit('agent_updated', { agent });
      
      console.log('[AgentService] Updated agent:', agent.name);
      return agent;
    } catch (error) {
      console.error('[AgentService] Failed to update agent:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to delete agent: ${response.statusText}`);
      }
      
      this.agents.delete(id);
      this.emit('agent_deleted', { agentId: id });
      
      console.log('[AgentService] Deleted agent:', id);
      return true;
    } catch (error) {
      console.error('[AgentService] Failed to delete agent:', error);
      throw error;
    }
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  async setState(agentId: string, state: AgentState): Promise<void> {
    const agent = await this.update(agentId, { state });
    if (agent) {
      this.emit('agent_state_changed', { agent, previousState: agent.state, newState: state });
    }
  }

  async toggleState(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const newState: AgentState = agent.state === 'on' ? 'off' : 'on';
    await this.setState(agentId, newState);
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  async execute(agentId: string, request: ExecuteAgentRequest = {}): Promise<AgentExecution> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to execute agent: ${response.statusText}`);
      }
      
      const execution: AgentExecution = await response.json();
      this.executions.set(execution.id, execution);
      this.emit('execution_started', { execution });
      
      console.log('[AgentService] Execution started:', execution.id, 'Status:', execution.status);
      console.log('[AgentService] Active executions:', this.getActiveExecutions().length);
      
      // Dispatch event for UI
      window.dispatchEvent(new CustomEvent('agent-execution-started', {
        detail: { execution, agentId }
      }));
      
      // Get agent details
      const agent = await this.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Send initial message to chat
      await this.sendMessage(
        agentId,
        `🤖 ${agent.name} is starting...`,
        'system'
      );
      
      // Execute agent asynchronously
      this.executeAgentAsync(execution, agent, request).catch(error => {
        console.error('[AgentService] Agent execution failed:', error);
      });
      
      return execution;
    } catch (error) {
      console.error('[AgentService] Failed to execute agent:', error);
      throw error;
    }
  }

  private async executeAgentAsync(
    execution: AgentExecution,
    agent: Agent,
    request: ExecuteAgentRequest
  ): Promise<void> {
    try {
      // Import agentChatService dynamically to avoid circular dependency
      const { agentChatService } = await import('./agentChatService');
      const { backendApi } = await import('./backendApi');
      
      // Build the execution message
      const message = request.message || 'Execute your task';
      
      // Execute with the agent's master prompt as system context
      // Pass empty history array since this is a new execution
      const response = await agentChatService.executeWithTools(
        message,
        [], // Empty history for new execution
        {
          sessionId: execution.id,
          systemPrompt: agent.masterPrompt,
          allowedTools: agent.allowedTools,
          onToolStart: (toolCall) => {
            this.sendMessage(
              agent.id,
              `🔧 Using tool: ${toolCall.name}`,
              'system'
            );
          },
          onToolComplete: (result) => {
            if (!result.success) {
              this.sendMessage(
                agent.id,
                `⚠️ Tool ${result.toolCallId} failed: ${result.error || 'Unknown error'}`,
                'system'
              );
            }
          }
        }
      );
      
      // Send agent's response to chat
      await this.sendMessage(
        agent.id,
        response.content,
        'output',
        response.thought
      );
      
      // Mark execution as completed
      execution.status = 'completed';
      execution.completedAt = Date.now();
      this.executions.set(execution.id, execution);
      this.emit('execution_completed', { execution });
      
      await this.sendMessage(
        agent.id,
        `✅ ${agent.name} completed successfully`,
        'system'
      );
      
      // Sync status to backend
      try {
        await backendApi.updateExecutionStatus(
          execution.id,
          'completed'
        );
        console.log('[AgentService] Synced execution status to backend:', execution.id);
      } catch (error) {
        console.error('[AgentService] Failed to sync execution status to backend:', error);
      }
      
    } catch (error) {
      // Mark execution as failed
      execution.status = 'failed';
      execution.completedAt = Date.now();
      execution.error = error instanceof Error ? error.message : String(error);
      this.executions.set(execution.id, execution);
      this.emit('execution_completed', { execution });
      
      await this.sendMessage(
        agent.id,
        `❌ ${agent.name} failed: ${execution.error}`,
        'system'
      );
      
      // Sync error status to backend
      try {
        const { backendApi } = await import('./backendApi');
        await backendApi.updateExecutionStatus(
          execution.id,
          'failed',
          execution.error
        );
        console.log('[AgentService] Synced error status to backend:', execution.id);
      } catch (syncError) {
        console.error('[AgentService] Failed to sync error status to backend:', syncError);
      }
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.completedAt = Date.now();
      this.emit('execution_cancelled', { execution });
    }
  }

  getExecution(executionId: string): AgentExecution | undefined {
    return this.executions.get(executionId);
  }

  getActiveExecutions(): AgentExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'running');
  }

  getAgentExecutions(agentId: string): AgentExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.agentId === agentId);
  }

  // ==========================================================================
  // Trigger Management
  // ==========================================================================

  async checkMessageTriggers(message: string): Promise<Agent[]> {
    await this.ensureLoaded();
    const messageLower = message.toLowerCase();
    const triggered: Agent[] = [];

    for (const agent of this.agents.values()) {
      if (agent.state !== 'on' || !agent.trigger) continue;

      const trigger = agent.trigger;
      if (trigger.type === 'keyword' && trigger.keywords && trigger.autoActivate) {
        if (trigger.keywords.some(k => messageLower.includes(k.toLowerCase()))) {
          triggered.push(agent);
        }
      }
    }

    return triggered;
  }

  async checkFileTriggers(filePath: string, event: 'save' | 'create'): Promise<Agent[]> {
    await this.ensureLoaded();
    const triggered: Agent[] = [];

    for (const agent of this.agents.values()) {
      if (agent.state !== 'on' || !agent.trigger) continue;

      const trigger = agent.trigger;
      if (trigger.type === 'file_event' && trigger.patterns && trigger.autoActivate) {
        if (this.matchesPatterns(filePath, trigger.patterns)) {
          triggered.push(agent);
        }
      }
    }

    return triggered;
  }

  private matchesPatterns(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern.includes('*')) {
        const parts = pattern.split('*');
        if (parts.length === 2) {
          return path.startsWith(parts[0]) && path.endsWith(parts[1]);
        }
        return path.includes(pattern.replace(/\*/g, ''));
      }
      return path.endsWith(pattern) || path.includes(pattern);
    });
  }

  // ==========================================================================
  // Tool Integration
  // ==========================================================================

  async getToolcallAgents(): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.agents.values())
      .filter(a => a.trigger?.type === 'toolcall' && a.state === 'on');
  }

  getToolcallDefinition(agentId: string): any {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return {
      name: `invoke_agent_${agentId}`,
      description: agent.description,
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message or task for the agent'
          },
          context: {
            type: 'object',
            description: 'Additional context for the agent'
          }
        },
        required: ['message']
      }
    };
  }

  async executeViaToolcall(agentId: string, args: any): Promise<any> {
    const execution = await this.execute(agentId, {
      message: args.message,
      context: args.context || {}
    });

    return {
      executionId: execution.id,
      status: execution.status,
      message: `Agent ${agentId} execution started`
    };
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  async sendMessage(agentId: string, content: string, type: MessageType = 'output', thought?: string): Promise<void> {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      content,
      thought,
      timestamp: Date.now(),
      type
    };

    this.emit('agent_message', { message });

    // Dispatch to chat interface
    window.dispatchEvent(new CustomEvent('agent-message', {
      detail: { message, agentId }
    }));
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  on(event: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
    return () => this.eventListeners.get(event)?.delete(listener);
  }

  public emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[AgentService] Event listener error:', error);
      }
    });
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private convertTriggerToBackend(trigger: TriggerConfig): any {
    const backendTrigger: any = {
      type: trigger.type,
    };

    if (trigger.keywords) {
      backendTrigger.keywords = trigger.keywords;
      backendTrigger.auto_activate = trigger.autoActivate;
    }
    if (trigger.patterns) {
      backendTrigger.patterns = trigger.patterns;
      backendTrigger.auto_activate = trigger.autoActivate;
    }
    if (trigger.cron) {
      backendTrigger.cron = trigger.cron;
      backendTrigger.auto_activate = trigger.autoActivate;
    }
    if (trigger.type === 'toolcall') {
      backendTrigger.auto_activate = trigger.autoActivate;
    }

    return backendTrigger;
  }

  private async initializeDefaultAgents(): Promise<void> {
    // Wait for agents to be loaded first
    await this.ensureLoaded();
    
    // Check if Agent Builder already exists (check both memory and backend)
    const existingBuilder = Array.from(this.agents.values())
      .find(a => a.isDefault && a.name === 'Agent Builder');
    
    if (existingBuilder) {
      console.log('[AgentService] Agent Builder already exists:', existingBuilder.id);
      return;
    }

    // Double-check by searching all agents by name
    const allAgents = await this.list();
    const builderByName = allAgents.find(a => a.name === 'Agent Builder');
    
    if (builderByName) {
      console.log('[AgentService] Agent Builder found by name:', builderByName.id);
      // Mark it as default if it isn't already
      if (!builderByName.isDefault) {
        builderByName.isDefault = true;
        await this.update(builderByName.id, { state: 'on' });
      }
      return;
    }

    // Create default Agent Builder agent
    try {
      console.log('[AgentService] Creating new Agent Builder...');
      const agentBuilder = await this.create({
        name: 'Agent Builder',
        description: 'Creates new agents through guided conversation. Ask me to create an agent and I\'ll walk you through the process.',
        tags: ['default', 'builder', 'meta'],
        masterPrompt: `You are the Agent Builder, responsible for creating new agents through a guided process.

Your role is to execute three workflows in sequence:
1. Agent Gatherer - Ask questions to understand what the user needs
2. Agent Designer - Design the automation strategy and workflows
3. Agent Builder - Create the actual agent via the create_agent tool

You are patient, helpful, and thorough. You ask clear questions and wait for responses.
You validate all information before creating an agent.
You celebrate successful agent creation and help users understand how to use their new agent.

When a user asks you to create an agent, start by executing the Agent Gatherer workflow.`,
        workflows: [
          'agent-gatherer-workflow',
          'agent-designer-workflow',
          'agent-builder-workflow'
        ],
        allowedTools: [
          'read_file',
          'write_file',
          'list_directory',
          'create_agent'
        ],
        trigger: {
          type: 'keyword',
          keywords: [
            'create agent',
            'new agent',
            'build agent',
            'make agent',
            'create an agent',
            'build an agent'
          ],
          autoActivate: true
        }
      });

      // Mark as default agent
      agentBuilder.isDefault = true;
      await this.update(agentBuilder.id, { state: 'on' });
      
      console.log('[AgentService] Created default Agent Builder:', agentBuilder.id);
    } catch (error) {
      console.error('[AgentService] Failed to create Agent Builder:', error);
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
  }

  private async loadAgents(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agents`);
      if (!response.ok) {
        console.warn('[AgentService] Failed to load agents:', response.statusText);
        return;
      }

      const agents: Agent[] = await response.json();
      this.agents.clear();
      agents.forEach(agent => {
        this.agents.set(agent.id, agent);
      });

      console.log(`[AgentService] Loaded ${agents.length} agents`);
    } catch (error) {
      console.error('[AgentService] Failed to load agents:', error);
    }
  }

  // ==========================================================================
  // Search & Filter
  // ==========================================================================

  async search(query: string): Promise<Agent[]> {
    await this.ensureLoaded();
    const queryLower = query.toLowerCase();
    
    return Array.from(this.agents.values()).filter(agent => 
      agent.name.toLowerCase().includes(queryLower) ||
      agent.description.toLowerCase().includes(queryLower) ||
      agent.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  async filter(options: {
    state?: AgentState;
    tags?: string[];
    search?: string;
  }): Promise<Agent[]> {
    await this.ensureLoaded();
    let agents = Array.from(this.agents.values());

    if (options.state) {
      agents = agents.filter(a => a.state === options.state);
    }

    if (options.tags && options.tags.length > 0) {
      agents = agents.filter(a => 
        options.tags!.some(tag => a.tags.includes(tag))
      );
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower)
      );
    }

    return agents;
  }
}

// Export singleton instance
export const agentService = new AgentService();
