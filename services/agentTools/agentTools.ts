/**
 * Agent Tools
 * 
 * Tool handlers for agent invocation and management
 */

import { agentService, Agent, AgentExecution } from '../agentService';

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Invoke an agent to handle a task
 */
export async function invokeAgent(args: {
  agent_id: string;
  message: string;
  context?: Record<string, any>;
}): Promise<{
  success: boolean;
  execution_id: string;
  agent_name: string;
  status: string;
  message: string;
}> {
  try {
    console.log('[AgentTools] invokeAgent called with agent_id:', args.agent_id);
    
    // Try to get agent by ID first
    let agent = await agentService.get(args.agent_id);
    console.log('[AgentTools] Agent lookup by ID result:', agent ? agent.name : 'not found');
    
    // If not found by ID, try to find by name
    if (!agent) {
      console.log('[AgentTools] Trying to find agent by name...');
      const allAgents = await agentService.list();
      console.log('[AgentTools] Total agents loaded:', allAgents.length);
      console.log('[AgentTools] Agent names:', allAgents.map(a => a.name));
      
      agent = allAgents.find(a => a.name === args.agent_id);
      console.log('[AgentTools] Agent lookup by name result:', agent ? agent.name : 'not found');
    }
    
    if (!agent) {
      return {
        success: false,
        execution_id: '',
        agent_name: '',
        status: 'error',
        message: `Agent not found: ${args.agent_id}`
      };
    }

    if (agent.state !== 'on') {
      return {
        success: false,
        execution_id: '',
        agent_name: agent.name,
        status: 'error',
        message: `Agent is ${agent.state}. Please enable it first.`
      };
    }

    console.log('[AgentTools] Executing agent:', agent.name, 'with ID:', agent.id);
    const execution = await agentService.execute(agent.id, {
      message: args.message,
      context: args.context || {}
    });

    return {
      success: true,
      execution_id: execution.id,
      agent_name: agent.name,
      status: execution.status,
      message: `Agent "${agent.name}" has been invoked. Execution ID: ${execution.id}`
    };
  } catch (error) {
    console.error('[AgentTools] Failed to invoke agent:', error);
    return {
      success: false,
      execution_id: '',
      agent_name: '',
      status: 'error',
      message: `Failed to invoke agent: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * List available agents
 */
export async function listAgents(args: {
  state?: 'on' | 'off' | 'sleeping' | 'failing';
  tags?: string[];
}): Promise<{
  success: boolean;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    state: string;
    tags: string[];
    allowed_tools: string[];
    workflows: string[];
  }>;
  count: number;
}> {
  try {
    let agents: Agent[];

    if (args.state) {
      agents = await agentService.listByState(args.state);
    } else if (args.tags && args.tags.length > 0) {
      agents = await agentService.listByTags(args.tags);
    } else {
      agents = await agentService.list();
    }

    return {
      success: true,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        state: agent.state,
        tags: agent.tags,
        allowed_tools: agent.allowedTools,
        workflows: agent.workflows
      })),
      count: agents.length
    };
  } catch (error) {
    console.error('[AgentTools] Failed to list agents:', error);
    return {
      success: false,
      agents: [],
      count: 0
    };
  }
}

/**
 * Create a new agent (restricted to Agent Builder)
 */
export async function createAgent(args: {
  name: string;
  description: string;
  master_prompt: string;
  workflows?: string[];
  allowed_tools?: string[];
  trigger?: any;
}, callerAgentId?: string): Promise<{
  success: boolean;
  agent_id?: string;
  agent_name?: string;
  message: string;
}> {
  try {
    // Check if caller is Agent Builder (if callerAgentId is provided)
    if (callerAgentId) {
      const caller = await agentService.get(callerAgentId);
      if (!caller || !caller.isDefault || caller.name !== 'Agent Builder') {
        return {
          success: false,
          message: 'Only the Agent Builder agent can create new agents'
        };
      }
    }

    const agent = await agentService.create({
      name: args.name,
      description: args.description,
      masterPrompt: args.master_prompt,
      workflows: args.workflows || [],
      allowedTools: args.allowed_tools || [],
      trigger: args.trigger
    });

    return {
      success: true,
      agent_id: agent.id,
      agent_name: agent.name,
      message: `Agent "${agent.name}" created successfully with ID: ${agent.id}`
    };
  } catch (error) {
    console.error('[AgentTools] Failed to create agent:', error);
    return {
      success: false,
      message: `Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get agent execution status
 */
export async function getAgentStatus(args: {
  execution_id: string;
}): Promise<{
  success: boolean;
  execution?: {
    id: string;
    agent_id: string;
    status: string;
    started_at: number;
    completed_at?: number;
    current_workflow_id?: string;
    messages: Array<{
      content: string;
      type: string;
      timestamp: number;
    }>;
  };
  message: string;
}> {
  try {
    const execution = agentService.getExecution(args.execution_id);

    if (!execution) {
      return {
        success: false,
        message: `Execution not found: ${args.execution_id}`
      };
    }

    return {
      success: true,
      execution: {
        id: execution.id,
        agent_id: execution.agentId,
        status: execution.status,
        started_at: execution.startedAt,
        completed_at: execution.completedAt,
        current_workflow_id: execution.currentWorkflowId,
        messages: execution.messages.map(msg => ({
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp
        }))
      },
      message: 'Execution status retrieved successfully'
    };
  } catch (error) {
    console.error('[AgentTools] Failed to get agent status:', error);
    return {
      success: false,
      message: `Failed to get agent status: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Cancel an agent execution
 */
export async function cancelAgentExecution(args: {
  execution_id: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await agentService.cancelExecution(args.execution_id);

    return {
      success: true,
      message: `Execution ${args.execution_id} cancelled successfully`
    };
  } catch (error) {
    console.error('[AgentTools] Failed to cancel execution:', error);
    return {
      success: false,
      message: `Failed to cancel execution: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
