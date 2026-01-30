/**
 * Workflow Tools for AI Agent Integration
 * 
 * Provides AI agents with workflow management capabilities:
 * - create_workflow: Create new workflows
 * - execute_workflow: Run a workflow
 * - list_workflows: List available workflows
 * - get_workflow: Get workflow details
 * 
 * These tools enable AI agents to create, manage, and execute workflows
 * as part of their task automation capabilities.
 */

import { 
  workflowService, 
  Workflow, 
  WorkflowType, 
  WorkflowStep,
  TriggerType,
  OutputSettings,
  WorkflowBehavior,
  CreateWorkflowRequest 
} from '../workflowService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required: string[];
  };
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  default?: any;
  items?: { type: string; properties?: Record<string, ParameterDefinition>; required?: string[] };
  properties?: Record<string, ParameterDefinition>;
  required?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const workflowToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_workflow',
    description: 'Create a new workflow with steps, triggers, and behavior settings. Use this when the user wants to automate a task or create a repeatable process.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the workflow',
        },
        description: {
          type: 'string',
          description: 'Description of what the workflow does',
        },
        workflowType: {
          type: 'string',
          description: 'Type of workflow: hook (auto-triggered), process (step-by-step), or manual (user-triggered)',
          enum: ['hook', 'process', 'manual'],
        },
        category: {
          type: 'string',
          description: 'Category for organizing workflows (e.g., "development", "documentation", "testing")',
        },
        steps: {
          type: 'array',
          description: 'Array of workflow steps defining the process.',
          items: { 
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier for the step (e.g. "step-1")' },
              name: { type: 'string', description: 'Human-readable name for the step' },
              prompt: { type: 'string', description: 'The instructions for the AI to follow in this step. Can use {{var}} for variable substitution.' },
              order: { type: 'number', description: 'Execution order (1, 2, 3...)' },
              nextStep: { type: 'string', description: 'ID of the next step to execute after this one.' },
              outputFormat: { type: 'string', description: 'Optional format hint: "text", "markdown", "json", or "file".' },
              outputVar: { type: 'string', description: 'Optional variable name to store the output of this step for use in later steps.' },
              requiresConfirmation: { type: 'boolean', description: 'Whether to pause and wait for user confirmation before moving to the next step.' },
              decision: {
                type: 'object',
                description: 'Optional branching logic based on step output.',
                properties: {
                  condition: { type: 'string', description: 'Natural language description of the decision criteria.' },
                  trueBranch: { type: 'string', description: 'Step ID to follow if condition is met.' },
                  falseBranch: { type: 'string', description: 'Step ID to follow if condition is NOT met.' }
                }
              }
            },
            required: ['name', 'prompt']
          } as any, // Cast to any to bypass strict ToolDefinition if needed, but it should match now
        },
        intent: {
          type: 'string',
          description: 'Keywords/phrases that describe when this workflow should be suggested or triggered',
        },
        trigger: {
          type: 'object',
          description: 'Trigger configuration for hook workflows (type, patterns, keywords)',
        },
        outputSettings: {
          type: 'object',
          description: 'Output settings (folder, filePattern, formatDescription)',
        },
        behavior: {
          type: 'object',
          description: 'Behavior settings (asToolcall, autoRetry, background, notifyOnComplete)',
        },
      },
      required: ['name', 'description', 'workflowType', 'steps'],
    },
  },
  {
    name: 'execute_workflow',
    description: 'Execute a workflow by ID. Returns the execution context for tracking progress.',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to execute',
        },
        variables: {
          type: 'object',
          description: 'Variables to pass to the workflow execution',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'list_workflows',
    description: 'List all available workflows, optionally filtered by category or type.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (e.g., "default", "custom")',
        },
        workflowType: {
          type: 'string',
          description: 'Filter by type: hook, process, or manual',
          enum: ['hook', 'process', 'manual'],
        },
        toolcallOnly: {
          type: 'boolean',
          description: 'Only return workflows that can be used as tool calls',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_workflow',
    description: 'Get detailed information about a specific workflow.',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to retrieve',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Update an existing workflow with new settings.',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to update',
        },
        updates: {
          type: 'object',
          description: 'Object containing the fields to update',
        },
      },
      required: ['workflowId', 'updates'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete a workflow by ID.',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to delete',
        },
      },
      required: ['workflowId'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleCreateWorkflow(args: {
  name: string;
  description: string;
  workflowType: WorkflowType;
  category?: string;
  steps: WorkflowStep[];
  intent?: string;
  trigger?: TriggerType;
  outputSettings?: OutputSettings;
  behavior?: WorkflowBehavior;
}): Promise<ToolResult> {
  try {
    // Validate steps
    if (!args.steps || args.steps.length === 0) {
      return {
        success: false,
        error: 'Workflow must have at least one step',
        metadata: { errorType: 'validation_error' },
      };
    }

    // Ensure steps have IDs and order
    const steps = args.steps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`,
      order: step.order || index + 1,
    }));

    const request: CreateWorkflowRequest = {
      name: args.name,
      description: args.description,
      workflowType: args.workflowType,
      category: args.category,
      steps,
      intent: args.intent,
      trigger: args.trigger,
      outputSettings: args.outputSettings,
      behavior: args.behavior,
    };

    const workflow = await workflowService.create(request);

    return {
      success: true,
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        type: workflow.workflowType,
        stepCount: workflow.steps.length,
        message: `Workflow "${workflow.name}" created successfully`,
      },
      metadata: {
        category: workflow.category,
        asToolcall: workflow.behavior.asToolcall,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create workflow: ${errorMessage}`,
      metadata: { errorType: 'creation_failed' },
    };
  }
}

export async function handleExecuteWorkflow(args: {
  workflowId: string;
  variables?: Record<string, any>;
}): Promise<ToolResult> {
  try {
    const context = await workflowService.execute(args.workflowId, args.variables || {});
    const workflow = await workflowService.get(args.workflowId);

    return {
      success: true,
      data: {
        executionId: context.executionId,
        workflowId: context.workflowId,
        workflowName: workflow?.name,
        currentStepId: context.currentStepId,
        status: context.status,
        message: `Workflow "${workflow?.name}" execution started`,
      },
      metadata: {
        startedAt: context.startedAt,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to execute workflow: ${errorMessage}`,
      metadata: { errorType: 'execution_failed' },
    };
  }
}

export async function handleListWorkflows(args: {
  category?: string;
  workflowType?: WorkflowType;
  toolcallOnly?: boolean;
}): Promise<ToolResult> {
  try {
    let workflows: Workflow[];

    if (args.toolcallOnly) {
      workflows = await workflowService.getToolcallWorkflows();
    } else if (args.category) {
      workflows = await workflowService.listByCategory(args.category);
    } else if (args.workflowType) {
      workflows = await workflowService.listByType(args.workflowType);
    } else {
      workflows = await workflowService.list();
    }

    const summary = workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      type: wf.workflowType,
      category: wf.category,
      stepCount: wf.steps.length,
      runCount: wf.runCount,
      status: wf.status,
      asToolcall: wf.behavior.asToolcall,
    }));

    return {
      success: true,
      data: {
        workflows: summary,
        count: workflows.length,
      },
      metadata: {
        filters: {
          category: args.category,
          workflowType: args.workflowType,
          toolcallOnly: args.toolcallOnly,
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to list workflows: ${errorMessage}`,
      metadata: { errorType: 'list_failed' },
    };
  }
}

export async function handleGetWorkflow(args: { workflowId: string }): Promise<ToolResult> {
  try {
    const workflow = await workflowService.get(args.workflowId);

    if (!workflow) {
      return {
        success: false,
        error: `Workflow ${args.workflowId} not found`,
        metadata: { errorType: 'not_found' },
      };
    }

    return {
      success: true,
      data: workflow,
      metadata: {
        stepCount: workflow.steps.length,
        hasDecisions: workflow.steps.some(s => s.decision),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to get workflow: ${errorMessage}`,
      metadata: { errorType: 'get_failed' },
    };
  }
}

export async function handleUpdateWorkflow(args: {
  workflowId: string;
  updates: Partial<Workflow>;
}): Promise<ToolResult> {
  try {
    const updated = await workflowService.update(args.workflowId, args.updates);

    if (!updated) {
      return {
        success: false,
        error: `Workflow ${args.workflowId} not found`,
        metadata: { errorType: 'not_found' },
      };
    }

    return {
      success: true,
      data: {
        workflowId: updated.id,
        name: updated.name,
        message: `Workflow "${updated.name}" updated successfully`,
      },
      metadata: {
        updatedAt: updated.updatedAt,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to update workflow: ${errorMessage}`,
      metadata: { errorType: 'update_failed' },
    };
  }
}

export async function handleDeleteWorkflow(args: { workflowId: string }): Promise<ToolResult> {
  try {
    const deleted = await workflowService.delete(args.workflowId);

    if (!deleted) {
      return {
        success: false,
        error: `Workflow ${args.workflowId} not found`,
        metadata: { errorType: 'not_found' },
      };
    }

    return {
      success: true,
      data: {
        workflowId: args.workflowId,
        message: 'Workflow deleted successfully',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to delete workflow: ${errorMessage}`,
      metadata: { errorType: 'delete_failed' },
    };
  }
}

// ============================================================================
// Tool Router
// ============================================================================

export async function executeWorkflowTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolResult> {
  switch (toolName) {
    case 'create_workflow':
      return handleCreateWorkflow(args as any);
    
    case 'execute_workflow':
      return handleExecuteWorkflow(args as any);
    
    case 'list_workflows':
      return handleListWorkflows(args as any);
    
    case 'get_workflow':
      return handleGetWorkflow(args as any);
    
    case 'update_workflow':
      return handleUpdateWorkflow(args as any);
    
    case 'delete_workflow':
      return handleDeleteWorkflow(args as any);
    
    default:
      return {
        success: false,
        error: `Unknown workflow tool: ${toolName}`,
        metadata: {
          errorType: 'unknown_tool',
          availableTools: workflowToolDefinitions.map(t => t.name),
        },
      };
  }
}
