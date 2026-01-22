/**
 * Workflow Service
 * 
 * Manages workflow definitions, execution, and triggers.
 * Provides a tree-of-decision based workflow system with support for:
 * - Hook workflows (auto-triggered)
 * - Process workflows (step-by-step)
 * - Manual workflows (user-triggered)
 */

import { backendApi } from './backendApi';
import { fileOperations } from './fileOperations';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type WorkflowType = 'hook' | 'process' | 'manual';
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface TriggerType {
  type: 'on_file_save' | 'on_file_create' | 'on_message' | 'on_git_commit' | 'on_error' | 'on_schedule' | 'on_ai_detection' | 'custom';
  patterns?: string[];
  keywords?: string[];
  intentPatterns?: string[];
  errorPatterns?: string[];
  cron?: string;
  condition?: string;
}

export interface DecisionNode {
  id: string;
  condition: string;
  trueBranch?: string;
  falseBranch?: string;
}

export interface WorkflowLoop {
  type: 'foreach';
  source: string;
  itemVar: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  order: number;
  decision?: DecisionNode;
  nextStep?: string;
  outputFormat?: string;
  requiresConfirmation?: boolean;
  timeoutSecs?: number;
  outputVar?: string;
  loop?: WorkflowLoop;
  inputRequest?: {
    enabled: boolean;
    placeholder?: string;
  };
}

export interface OutputSettings {
  folder?: string;
  filePattern?: string;
  formatDescription?: string;
  appendMode?: boolean;
  timestamped?: boolean;
}

export interface WorkflowBehavior {
  asToolcall?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  background?: boolean;
  notifyOnComplete?: boolean;
  logExecution?: boolean;
}

export interface WorkflowVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  required?: boolean;
  defaultValue?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];
  intent?: string;
  trigger?: TriggerType;
  outputSettings: OutputSettings;
  behavior: WorkflowBehavior;
  createdAt: number;
  updatedAt: number;
  runCount: number;
  lastRun?: number;
  status: WorkflowStatus;
  variables?: WorkflowVariable[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  decisionResult?: boolean;
  generatedFiles?: string[];
}

export interface LoopState {
  stepId: string;
  items: any[];
  currentIndex: number;
  itemVar: string;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  currentStepId?: string;
  variables: Record<string, any>;
  stepResults: Record<string, StepResult>;
  startedAt: number;
  completedAt?: number;
  status: WorkflowStatus;
  loopState?: LoopState;
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  workflowType: WorkflowType;
  category?: string;
  steps: WorkflowStep[];
  intent?: string;
  trigger?: TriggerType;
  outputSettings?: OutputSettings;
  behavior?: WorkflowBehavior;
  variables?: WorkflowVariable[];
}

// ============================================================================
// Default Workflows
// ============================================================================

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'default-steering-file',
    name: 'Create Agent Steering File',
    description: 'Create a structured steering file for agent behavior configuration',
    category: 'default',
    workflowType: 'process',
    intent: 'create steering file, agent configuration, behavior rules',
    steps: [
      {
        id: 's1',
        name: 'Analyze Context',
        prompt: `Analyze the current project structure to understand the context for creating a steering file.

Use the available tools to:
1. List the project directory structure to understand the codebase
2. Look for existing configuration files or documentation

Based on your analysis, describe:
- What type of project this is
- What behaviors and rules would be appropriate for an AI agent working on this project
- Any coding standards or patterns you observe`,
        order: 1,
        nextStep: 's2',
        outputFormat: 'markdown',
        timeoutSecs: 60,
      },
      {
        id: 's2',
        name: 'Define Rules',
        prompt: `Based on the project analysis, define specific rules and guidelines for the steering file.

Create a YAML structure with:
- Project context and description
- Coding standards (language, formatting, patterns)
- File organization rules
- Interaction guidelines for the AI agent
- Any project-specific conventions

Format the output as valid YAML that can be used in a steering file.`,
        order: 2,
        nextStep: 's3',
        outputFormat: 'yaml',
        requiresConfirmation: true,
        timeoutSecs: 120,
      },
      {
        id: 's3',
        name: 'Generate File',
        prompt: `Create the steering file with the defined rules.

Use the write_file tool to save the steering file to: .kiro/steering/project-rules.md

The file should have:
1. YAML frontmatter with metadata (inclusion: always)
2. Markdown content with the rules and guidelines

If you don't have write_file access, output the complete file content so the user can save it manually.`,
        order: 3,
        outputFormat: 'file',
        timeoutSecs: 30,
      },
    ],
    outputSettings: {
      folder: '.kiro/steering',
      filePattern: '{name}.md',
      formatDescription: 'Markdown file with YAML frontmatter',
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  {
    id: 'default-auto-workflow',
    name: 'Create Workflow from Conversation',
    description: 'Automatically detect and create workflows from conversation patterns',
    category: 'default',
    workflowType: 'hook',
    intent: 'create workflow, automate task, save as workflow',
    trigger: {
      type: 'on_ai_detection',
      intentPatterns: [
        'create a workflow',
        'save this as a workflow',
        'automate this',
        'make this repeatable',
      ],
    },
    steps: [
      {
        id: 's1',
        name: 'Extract Pattern',
        prompt: `Analyze the recent conversation history and extract a repeatable workflow pattern.

Identify:
1. The main goal or task being accomplished
2. The sequence of steps taken
3. Any inputs or parameters needed
4. Expected outputs or results

Determine if this can be converted into a reusable workflow.
Output your analysis as JSON with: { "isValid": boolean, "reason": string, "steps": [...] }`,
        order: 1,
        decision: {
          id: 'd1',
          condition: 'Is this a valid workflow pattern?',
          trueBranch: 's2',
          falseBranch: 's_invalid',
        },
        outputFormat: 'json',
        timeoutSecs: 60,
      },
      {
        id: 's_invalid',
        name: 'Invalid Pattern',
        prompt: 'Explain why this cannot be converted to a workflow and suggest alternatives.',
        order: 2,
        timeoutSecs: 30,
      },
      {
        id: 's2',
        name: 'Define Workflow',
        prompt: 'Create the workflow definition with proper steps, triggers, and output settings. Ask the user for workflow name and type.',
        order: 3,
        nextStep: 's3',
        outputFormat: 'json',
        requiresConfirmation: true,
        timeoutSecs: 120,
      },
      {
        id: 's3',
        name: 'Save Workflow',
        prompt: 'Save the workflow using the create_workflow tool and confirm creation to the user.',
        order: 4,
        timeoutSecs: 30,
      },
    ],
    outputSettings: {},
    behavior: {
      asToolcall: true,
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  {
    id: 'default-error-search',
    name: 'Search for Errors and Logic Enhancements',
    description: 'Analyze codebase for errors, bugs, and potential logic improvements',
    category: 'default',
    workflowType: 'manual',
    intent: 'find errors, search bugs, logic enhancement, code review',
    steps: [
      {
        id: 's1',
        name: 'Scan Codebase',
        prompt: `Scan the codebase for potential errors and issues.

Use available tools to:
1. List the main source directories (src/, components/, services/, etc.)
2. Search for common error patterns like TODO, FIXME, console.error
3. Look for files with recent modifications

Identify the most critical files that should be reviewed first.
Output a list of files to analyze with their priority level.`,
        order: 1,
        nextStep: 's2',
        outputFormat: 'json',
        timeoutSecs: 180,
      },
      {
        id: 's2',
        name: 'Analyze Logic',
        prompt: `Analyze the identified files for potential issues.

Look for:
1. Type errors or missing type annotations
2. Unhandled edge cases
3. Performance issues (unnecessary re-renders, memory leaks)
4. Security vulnerabilities (unsanitized inputs, exposed secrets)
5. Code duplication or poor patterns

Categorize issues as CRITICAL, WARNING, or SUGGESTION.
Are there any critical issues that need immediate attention?`,
        order: 2,
        decision: {
          id: 'd1',
          condition: 'Are there critical issues that need immediate attention?',
          trueBranch: 's3_critical',
          falseBranch: 's3_normal',
        },
        outputFormat: 'markdown',
        timeoutSecs: 120,
      },
      {
        id: 's3_critical',
        name: 'Critical Issues Report',
        prompt: `Generate a prioritized report of the CRITICAL issues found.

For each critical issue:
1. File and line location
2. Description of the problem
3. Potential impact (security, data loss, crashes)
4. Suggested fix with code example

Format as a clear, actionable report.`,
        order: 3,
        nextStep: 's4',
        outputFormat: 'markdown',
        requiresConfirmation: true,
        timeoutSecs: 60,
      },
      {
        id: 's3_normal',
        name: 'Enhancement Report',
        prompt: `Generate a report of suggested enhancements and optimizations.

Organize by:
1. Quick wins (easy fixes, high impact)
2. Medium effort improvements
3. Long-term refactoring suggestions

Include code examples where helpful.`,
        order: 3,
        nextStep: 's4',
        outputFormat: 'markdown',
        timeoutSecs: 60,
      },
      {
        id: 's4',
        name: 'Summary',
        prompt: 'Provide an executive summary of findings with actionable next steps.',
        order: 4,
        outputFormat: 'markdown',
        timeoutSecs: 30,
      },
    ],
    outputSettings: {
      folder: 'reports',
      filePattern: 'code-analysis-{timestamp}.md',
      formatDescription: 'Markdown report with findings and recommendations',
      timestamped: true,
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  // ============================================================================
  // Agent Builder Workflows
  // ============================================================================
  {
    id: 'agent-gatherer-workflow',
    name: 'Agent Gatherer',
    description: 'Discovers agent requirements through interactive questions',
    category: 'agent-builder',
    workflowType: 'process',
    intent: 'gather agent requirements, discover needs, agent questions',
    steps: [
      {
        id: 'g1',
        name: 'Greet & Understand',
        prompt: `You are the Agent Gatherer, the first step in creating a new agent.

Your goal is to understand what the user wants the agent to do. Ask clear, focused questions:

1. "What should this agent do?" - Get the main purpose
2. "What triggers should activate it?" - Understand when it should run
3. "What tools should it have access to?" - Determine capabilities

Be conversational and helpful. One question at a time. Wait for the user's response before asking the next question.

Start by greeting the user and asking the first question.`,
        order: 1,
        nextStep: 'g2',
        outputFormat: 'text',
        timeoutSecs: 300,
      },
      {
        id: 'g2',
        name: 'Gather Constraints',
        prompt: `Now gather information about constraints and preferences:

Ask these questions (one at a time, wait for responses):
1. "Any limitations or restrictions for this agent?"
2. "How should it handle errors?"
3. "Should it notify you when complete?"
4. "Any specific workflows it should use?"

Be patient and clarify if the user seems unsure.`,
        order: 2,
        nextStep: 'g3',
        outputFormat: 'text',
        timeoutSecs: 300,
      },
      {
        id: 'g3',
        name: 'Create Discovery Document',
        prompt: `Create a discovery document with all gathered information.

Use the write_file tool to save to: .skhoot/agent-discovery/{timestamp}-needs.md

Format the document as:
# Agent Discovery: [Agent Name]

## Purpose
[What the agent does]

## Triggers
[When it activates]

## Capabilities
### Tools
- [List of tools]

### Workflows
- [List of workflows]

## Constraints
[Any limitations]

## Error Handling
[How to handle errors]

## Notifications
[Notification preferences]

## Additional Notes
[Any other relevant information]

After creating the file, confirm to the user and provide the file path.`,
        order: 3,
        outputFormat: 'file',
        timeoutSecs: 60,
      },
    ],
    outputSettings: {
      folder: '.skhoot/agent-discovery',
      filePattern: '{timestamp}-needs.md',
      formatDescription: 'Markdown discovery document',
      timestamped: true,
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  {
    id: 'agent-designer-workflow',
    name: 'Agent Designer',
    description: 'Designs automation strategy from discovery document',
    category: 'agent-builder',
    workflowType: 'process',
    intent: 'design agent automation, create agent strategy',
    steps: [
      {
        id: 'd1',
        name: 'Read Discovery Document',
        prompt: `You are the Agent Designer. Your job is to design the automation strategy.

First, read the discovery document that was created by the Agent Gatherer.
Use the read_file tool to load the most recent file from .skhoot/agent-discovery/

Parse the requirements and constraints carefully.`,
        order: 1,
        nextStep: 'd2',
        outputFormat: 'text',
        timeoutSecs: 60,
      },
      {
        id: 'd2',
        name: 'Design Workflows',
        prompt: `Based on the discovery document, design the workflows this agent needs.

For each workflow, define:
1. Workflow name and purpose
2. Steps in the workflow
3. Tools required for each step
4. Decision points (if any)
5. Expected outputs

Think about:
- What sequence of actions achieves the goal?
- What tools are needed at each step?
- Where might the agent need to make decisions?
- How should errors be handled?

Output your workflow design in a structured format.`,
        order: 2,
        nextStep: 'd3',
        outputFormat: 'markdown',
        timeoutSecs: 180,
      },
      {
        id: 'd3',
        name: 'Create Master Prompt',
        prompt: `Create the master prompt that defines the agent's behavior and personality.

The master prompt should:
1. Define the agent's role and purpose
2. Specify behavior guidelines
3. Include success criteria
4. Define how to interact with users
5. Specify error handling approach

Make it clear, concise, and actionable. The agent will use this as its core instruction set.

Example format:
"You are [Agent Name], responsible for [purpose].

Your primary goals are:
1. [Goal 1]
2. [Goal 2]

When executing tasks:
- [Guideline 1]
- [Guideline 2]

Success means: [Success criteria]

If errors occur: [Error handling]"`,
        order: 3,
        nextStep: 'd4',
        outputFormat: 'text',
        timeoutSecs: 120,
      },
      {
        id: 'd4',
        name: 'Update Document',
        prompt: `Update the discovery document with the automation design.

Use write_file tool to append to the existing discovery document:

## Automation Design

### Master Prompt
[The master prompt you created]

### Workflows
[The workflow designs]

### Required Tools
[List of all tools needed]

### Implementation Notes
[Any additional notes for the builder]

Confirm the update to the user.`,
        order: 4,
        outputFormat: 'file',
        requiresConfirmation: true,
        timeoutSecs: 60,
      },
    ],
    outputSettings: {
      folder: '.skhoot/agent-discovery',
      formatDescription: 'Updated discovery document with automation design',
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  {
    id: 'agent-builder-workflow',
    name: 'Agent Builder',
    description: 'Creates agent via backend API from discovery document',
    category: 'agent-builder',
    workflowType: 'process',
    intent: 'build agent, create agent from design',
    steps: [
      {
        id: 'b1',
        name: 'Read Final Document',
        prompt: `You are the Agent Builder. Your job is to create the actual agent.

Read the complete discovery document with the automation design.
Use read_file tool to load it from .skhoot/agent-discovery/

Extract all the information needed to create the agent:
- Name
- Description
- Master prompt
- Workflows
- Tools
- Trigger configuration`,
        order: 1,
        nextStep: 'b2',
        outputFormat: 'text',
        timeoutSecs: 60,
      },
      {
        id: 'b2',
        name: 'Validate Configuration',
        prompt: `Validate the agent configuration before creating it.

Check:
1. Name is not empty
2. Master prompt is clear and actionable
3. Tool names are valid (read_file, write_file, search_files, shell, etc.)
4. Workflow references exist (if any)
5. Trigger configuration is valid

If anything is missing or invalid, explain what needs to be fixed.
If everything is valid, confirm you're ready to create the agent.`,
        order: 2,
        decision: {
          id: 'b_decision',
          condition: 'Is the configuration valid?',
          trueBranch: 'b3',
          falseBranch: 'b_invalid',
        },
        outputFormat: 'text',
        timeoutSecs: 60,
      },
      {
        id: 'b_invalid',
        name: 'Report Validation Errors',
        prompt: `The configuration has validation errors. Report them clearly to the user.

Explain:
1. What's wrong
2. What needs to be fixed
3. How to fix it

The user will need to restart the agent creation process with corrections.`,
        order: 3,
        outputFormat: 'text',
        timeoutSecs: 30,
      },
      {
        id: 'b3',
        name: 'Create Agent',
        prompt: `Create the agent using the create_agent tool.

Call create_agent with:
{
  "name": "[agent name]",
  "description": "[agent description]",
  "master_prompt": "[the master prompt]",
  "workflows": ["workflow-id-1", "workflow-id-2"],
  "allowed_tools": ["tool1", "tool2", "tool3"],
  "trigger": {
    "type": "keyword",
    "keywords": ["trigger1", "trigger2"],
    "autoActivate": true
  }
}

After creation, confirm success and provide the agent ID.`,
        order: 4,
        nextStep: 'b4',
        outputFormat: 'text',
        timeoutSecs: 60,
      },
      {
        id: 'b4',
        name: 'Confirm Creation',
        prompt: `Congratulations! The agent has been created successfully.

Provide the user with:
1. Agent ID
2. Agent name
3. How to use it (trigger keywords or manual invocation)
4. Next steps (test it, modify it, etc.)

Encourage them to try it out!`,
        order: 5,
        outputFormat: 'text',
        timeoutSecs: 30,
      },
    ],
    outputSettings: {
      formatDescription: 'Agent creation confirmation',
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
  // ============================================================================
  // Test Workflows
  // ============================================================================
  {
    id: 'demo-meal-planner',
    name: 'Healthy Meal Planner',
    description: 'Plans a healthy week of meals with recipes, prices, and budget',
    category: 'demo',
    workflowType: 'manual',
    steps: [
      {
        id: 's1',
        name: 'Find Recipes',
        prompt: 'Search the web for 10 healthy recipes that are nutritious and easy to make. List them with their main ingredients.',
        order: 1,
        outputVar: 'recipes',
        timeoutSecs: 120
      },
      {
        id: 's2',
        name: 'Check Prices',
        prompt: 'Based on the recipes found, search for the current prices of the main ingredients for 2 people. Calculate approximate costs.',
        order: 2,
        outputVar: 'prices',
        timeoutSecs: 180
      },
      {
        id: 's3',
        name: 'Create Plan',
        prompt: 'Create a 7-day meal plan for 2 people using the recipes and prices found. Calculate the total budget. Ensure it is balanced.',
        order: 3,
        outputVar: 'plan',
        timeoutSecs: 120
      },
      {
        id: 's4',
        name: 'Generate HTML',
        prompt: 'Create a beautiful HTML file displaying the meal plan, recipes, and budget. Save it to "meal_plan.html" using the write_file tool.',
        order: 4,
        outputFormat: 'file',
        timeoutSecs: 60
      }
    ],
    outputSettings: {
      folder: 'outputs',
      filePattern: 'meal_plan.html',
      formatDescription: 'HTML Meal Plan'
    },
    behavior: {
      notifyOnComplete: true,
      logExecution: true,
      asToolcall: true // Enable tool access
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    status: 'idle',
  },
];

// ============================================================================
// Workflow Service Class
// ============================================================================

class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, ExecutionContext> = new Map();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private readonly STORAGE_PATH = '.skhoot/workflows';

  constructor() {
    this.initDefaults();
    this.loadFromDisk();
    this.loadExecutions();
  }

  private initDefaults(): void {
    DEFAULT_WORKFLOWS.forEach(wf => {
      this.workflows.set(wf.id, wf);
    });
  }

  async openStorage(): Promise<void> {
    try {
      // Ensure it exists by trying to write a dummy file if needed, or just open
      // backendApi.openFileLocation usually opens the folder
      await backendApi.openFileLocation(this.STORAGE_PATH);
    } catch (error) {
      console.error('[WorkflowService] Failed to open storage:', error);
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const result = await backendApi.listDirectory(this.STORAGE_PATH);
      // Handle various response formats (files array or items property)
      const items = Array.isArray(result) ? result : (result.files || result.items || []);
      
      for (const item of items) {
        if (item.name && item.name.endsWith('.json')) {
          try {
            const content = await backendApi.readFile(item.path);
            const workflow = JSON.parse(content);
            if (workflow.id && workflow.name) {
              this.workflows.set(workflow.id, workflow);
            }
          } catch (e) {
            console.error(`[WorkflowService] Failed to load ${item.name}:`, e);
          }
        }
      }
      this.emit('workflow_updated', { workflow: null }); // Force UI refresh
    } catch (error) {
      // Ignore errors if directory doesn't exist yet
    }
  }

  private async saveToDisk(workflow: Workflow): Promise<void> {
    try {
      const filePath = `${this.STORAGE_PATH}/${workflow.id}.json`;
      await backendApi.writeFile(filePath, JSON.stringify(workflow, null, 2));
    } catch (error) {
      console.error('[WorkflowService] Failed to save to disk:', error);
    }
  }

  private async deleteFromDisk(workflowId: string): Promise<void> {
    try {
      const filePath = `${this.STORAGE_PATH}/${workflowId}.json`;
      await fileOperations.delete(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  // ==========================================================================
  // Execution Persistence (LocalStorage)
  // ==========================================================================

  private loadExecutions(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('skhoot_workflow_executions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Sort by date descending and keep last 50 to avoid storage limits
          const recent = parsed
            .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
            .slice(0, 50);
            
          recent.forEach((ctx: ExecutionContext) => {
             this.executions.set(ctx.executionId, ctx);
          });
        }
      }
    } catch (e) {
      console.error('[WorkflowService] Failed to load executions from storage:', e);
    }
  }

  private saveExecutions(): void {
    if (typeof localStorage === 'undefined') return;

    try {
       // Convert map to array
       const all = Array.from(this.executions.values());
       
       // Filter: Keep active runs + last 50 completed
       const active = all.filter(e => e.status === 'running');
       const history = all
         .filter(e => e.status !== 'running')
         .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
         .slice(0, 50);
       
       const toSave = [...active, ...history];
       
       localStorage.setItem('skhoot_workflow_executions', JSON.stringify(toSave));
    } catch (e) {
       console.warn('[WorkflowService] Failed to save executions to storage (quota exceeded?):', e);
       // Try to save fewer items if it failed
       try {
         const active = Array.from(this.executions.values()).filter(e => e.status === 'running');
         localStorage.setItem('skhoot_workflow_executions', JSON.stringify(active));
       } catch (retryErr) {
         console.error('[WorkflowService] Critical: Failed to save even active executions', retryErr);
       }
    }
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  async list(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async listByCategory(category: string): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(wf => wf.category === category);
  }

  async listByType(type: WorkflowType): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(wf => wf.workflowType === type);
  }

  async get(id: string): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  // Synchronous getter for UI components
  getWorkflowSync(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  async create(request: CreateWorkflowRequest): Promise<Workflow> {
    const now = Date.now();
    const workflow: Workflow = {
      id: `wf-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      description: request.description,
      category: request.category || 'custom',
      workflowType: request.workflowType,
      steps: request.steps,
      intent: request.intent,
      trigger: request.trigger,
      outputSettings: request.outputSettings || {},
      behavior: request.behavior || { notifyOnComplete: true, logExecution: true },
      variables: request.variables,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      status: 'idle',
    };

    this.workflows.set(workflow.id, workflow);
    this.saveToDisk(workflow);
    this.emit('workflow_created', { workflow });
    return workflow;
  }

  async update(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    const updated: Workflow = {
      ...workflow,
      ...updates,
      id: workflow.id, // Prevent ID change
      updatedAt: Date.now(),
    };

    this.workflows.set(id, updated);
    this.saveToDisk(updated);
    this.emit('workflow_updated', { workflow: updated });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.workflows.delete(id);
    if (deleted) {
      this.deleteFromDisk(id);
      this.emit('workflow_deleted', { workflowId: id });
    }
    return deleted;
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  async execute(workflowId: string, variables: Record<string, any> = {}): Promise<ExecutionContext> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Merge default variables
    const finalVariables = { ...variables };
    if (workflow.variables) {
      workflow.variables.forEach(v => {
        if (finalVariables[v.name] === undefined && v.defaultValue !== undefined) {
          finalVariables[v.name] = v.defaultValue;
        }
      });
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const firstStep = workflow.steps.find(s => s.order === 1);

    const context: ExecutionContext = {
      workflowId,
      executionId,
      currentStepId: firstStep?.id,
      variables: finalVariables,
      stepResults: {},
      startedAt: Date.now(),
      status: 'running',
    };

    this.executions.set(executionId, context);
    
    // Update workflow status
    await this.update(workflowId, { status: 'running' });
    
    this.emit('execution_started', { context, workflow });
    this.saveExecutions();
    
    // Dispatch event to chat interface to start workflow execution
    window.dispatchEvent(new CustomEvent('workflow-execute', {
      detail: {
        executionId,
        workflow,
        context,
        currentStep: firstStep,
      }
    }));
    
    return context;
  }

  async executeStep(
    executionId: string,
    output: string,
    decisionResult?: boolean,
    generatedFiles?: string[]
  ): Promise<{ nextStepId?: string; completed: boolean }> {
    const context = this.executions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const currentStep = workflow.steps.find(s => s.id === context.currentStepId);
    if (!currentStep) {
      throw new Error('Current step not found');
    }

    // Process Output & Capture Variables
    let processedOutput: any = output;
    
    // Auto-detect file paths if not provided explicitly
    let detectedFiles = generatedFiles || [];
    if (detectedFiles.length === 0 && currentStep.outputFormat === 'file') {
       // Simple detection for file paths in output
       // Matches absolute paths or relative paths in common formats
       const pathMatch = output.match(/(?:\/|\\|[a-zA-Z]:\\)[^"'\n\r\t]+\.[a-zA-Z0-9]{1,5}/g);
       if (pathMatch) {
         detectedFiles = [...detectedFiles, ...pathMatch];
       }
    }
    
    if (currentStep.outputFormat === 'json') {
      try {
        // Try to find JSON block if mixed with text
        const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : output;
        processedOutput = JSON.parse(jsonStr);
      } catch (e) {
        console.warn('[WorkflowService] Failed to parse JSON output for step:', currentStep.id);
      }
    }

    if (currentStep.outputVar) {
      context.variables[currentStep.outputVar] = processedOutput;
    }

    // Record step result
    const result: StepResult = {
      stepId: currentStep.id,
      success: true,
      output, // Keep raw output for logs
      durationMs: 0,
      decisionResult,
      generatedFiles: detectedFiles.length > 0 ? detectedFiles : undefined
    };
    context.stepResults[currentStep.id] = result;

    // Determine next step using tree-of-decision logic
    let nextStepId: string | undefined;
    if (currentStep.decision) {
      nextStepId = decisionResult 
        ? currentStep.decision.trueBranch 
        : currentStep.decision.falseBranch;
    } else {
      nextStepId = currentStep.nextStep;
    }

    // ========================================================================
    // Loop Logic
    // ========================================================================
    
    // 1. Handle Active Loop (Iterate or Finish)
    if (context.loopState && context.loopState.stepId === currentStep.id) {
      context.loopState.currentIndex++;
      
      if (context.loopState.currentIndex < context.loopState.items.length) {
        // Continue Loop: Update variable and repeat step
        const nextItem = context.loopState.items[context.loopState.currentIndex];
        context.variables[context.loopState.itemVar] = nextItem;
        nextStepId = currentStep.id;
        console.log(`[WorkflowService] Looping step ${currentStep.id} (Index: ${context.loopState.currentIndex})`);
      } else {
        // Loop Finished: Clear state and proceed to nextStepId (already set above)
        console.log(`[WorkflowService] Loop finished for step ${currentStep.id}`);
        // IMPORTANT: The nextStepId was already determined by tree logic above (e.g. nextStep property)
        // We must ensure it's not pointing back to self if loop is done
        if (nextStepId === currentStep.id) {
           nextStepId = currentStep.nextStep;
        }
        
        context.loopState = undefined;
      }
    }

    // 2. Handle Next Step Loop Initialization (if not repeating self)
    if (nextStepId && nextStepId !== currentStep.id) {
      let nextStepObj = workflow.steps.find(s => s.id === nextStepId);
      
      // Handle skipping empty loops (simple 1-level skip for now)
      if (nextStepObj && nextStepObj.loop) {
        const sourceName = nextStepObj.loop.source;
        // Check variables, but also allow source to be a stringified array from previous step output
        let collection = context.variables[sourceName];
        
        // If variable is missing, check if it's the result of the previous step
        if (!collection && sourceName === currentStep.outputVar) {
           collection = context.variables[currentStep.outputVar];
        }

        if (Array.isArray(collection) && collection.length > 0) {
          // Initialize Loop
          console.log(`[WorkflowService] Initializing loop for step ${nextStepId} with ${collection.length} items`);
          context.loopState = {
            stepId: nextStepId,
            items: collection,
            currentIndex: 0,
            itemVar: nextStepObj.loop.itemVar
          };
          context.variables[nextStepObj.loop.itemVar] = collection[0];
        } else {
          // Skip loop step if collection is empty or missing
          console.log(`[WorkflowService] Skipping loop step ${nextStepId} (Empty/Invalid source: ${sourceName})`);
          nextStepId = nextStepObj.nextStep;
          
          // Re-fetch next step object if we skipped
          // Note: This doesn't handle consecutive empty loops recursively
        }
      }
    }

    context.currentStepId = nextStepId;

    // Check if workflow is complete
    const completed = !nextStepId;
    if (completed) {
      context.status = 'completed';
      context.completedAt = Date.now();
      
      const wf = this.workflows.get(context.workflowId);
      if (wf) {
        await this.update(context.workflowId, {
          status: 'idle',
          runCount: wf.runCount + 1,
          lastRun: Date.now(),
        });
      }
      
      this.emit('execution_completed', { context, workflow });
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('workflow-completed', {
        detail: { executionId, context, workflow }
      }));
    } else {
      // Get next step and dispatch event
      const nextStep = workflow.steps.find(s => s.id === nextStepId);
      this.emit('step_completed', { context, stepResult: result, nextStepId });
      
      // Dispatch event to continue workflow
      window.dispatchEvent(new CustomEvent('workflow-step-next', {
        detail: {
          executionId,
          workflow,
          context,
          currentStep: nextStep,
          previousResult: result,
        }
      }));
    }

    this.saveExecutions();
    return { nextStepId, completed };
  }

  async cancelExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    if (context) {
      context.status = 'cancelled';
      context.completedAt = Date.now();
      await this.update(context.workflowId, { status: 'idle' });
      this.saveExecutions();
      this.emit('execution_cancelled', { context });
    }
  }

  getExecution(executionId: string): ExecutionContext | undefined {
    return this.executions.get(executionId);
  }

  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'running');
  }

  getHistory(): ExecutionContext[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }

  // ==========================================================================
  // Trigger Management
  // ==========================================================================

  async checkMessageTriggers(message: string): Promise<Workflow[]> {
    const messageLower = message.toLowerCase();
    const triggered: Workflow[] = [];

    for (const workflow of this.workflows.values()) {
      if (workflow.workflowType !== 'hook' || !workflow.trigger) continue;

      const trigger = workflow.trigger;
      if (trigger.type === 'on_message' && trigger.keywords) {
        if (trigger.keywords.some(k => messageLower.includes(k.toLowerCase()))) {
          triggered.push(workflow);
        }
      } else if (trigger.type === 'on_ai_detection' && trigger.intentPatterns) {
        if (trigger.intentPatterns.some(p => messageLower.includes(p.toLowerCase()))) {
          triggered.push(workflow);
        }
      }
    }

    return triggered;
  }

  async checkFileTriggers(filePath: string, event: 'save' | 'create'): Promise<Workflow[]> {
    const triggered: Workflow[] = [];

    for (const workflow of this.workflows.values()) {
      if (workflow.workflowType !== 'hook' || !workflow.trigger) continue;

      const trigger = workflow.trigger;
      const triggerType = event === 'save' ? 'on_file_save' : 'on_file_create';
      
      if (trigger.type === triggerType && trigger.patterns) {
        if (this.matchesPatterns(filePath, trigger.patterns)) {
          triggered.push(workflow);
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
  // Toolcall Workflows
  // ==========================================================================

  async getToolcallWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(wf => wf.behavior.asToolcall);
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

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[WorkflowService] Event listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
