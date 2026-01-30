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
import { WorkflowExecutor } from './WorkflowExecutor';

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

const DEFAULT_WORKFLOWS: Workflow[] = [];


// ============================================================================
// Workflow Service Class
// ============================================================================

class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, ExecutionContext> = new Map();
  private executors: Map<string, WorkflowExecutor> = new Map();
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
    // 1. Load from LocalStorage first (instant)
    try {
      const stored = localStorage.getItem('skhoot_workflow_definitions');
      if (stored) {
        const workflows = JSON.parse(stored);
        if (Array.isArray(workflows)) {
          workflows.forEach((wf: Workflow) => {
            this.workflows.set(wf.id, wf);
          });
        }
      }
    } catch (e) {
      console.warn('[WorkflowService] Failed to load workflows from LocalStorage', e);
    }

    // 2. Sync from backend (source of truth)
    try {
      const response = await fetch(`${backendApi.baseUrl}/workflows`);
      if (response.ok) {
        const workflows = await response.json();
        workflows.forEach((wf: Workflow) => {
          this.workflows.set(wf.id, wf);
        });
        // Update LocalStorage cache
        this.saveToLocalStorage();
      }
      this.emit('workflow_updated', { workflow: null }); // Force UI refresh
    } catch (error) {
      console.warn('[WorkflowService] Failed to sync workflows from backend', error);
    }
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const all = Array.from(this.workflows.values());
      localStorage.setItem('skhoot_workflow_definitions', JSON.stringify(all));
    } catch (e) {
      console.warn('[WorkflowService] Failed to save workflows to LocalStorage', e);
    }
  }

  private async saveToDisk(workflow: Workflow): Promise<void> {
    this.saveToLocalStorage();
    try {
      await fetch(`${backendApi.baseUrl}/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });
    } catch (error) {
      console.error('[WorkflowService] Failed to save to backend:', error);
    }
  }

  private async deleteFromDisk(workflowId: string): Promise<void> {
    this.saveToLocalStorage();
    try {
      await fetch(`${backendApi.baseUrl}/workflows/${workflowId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('[WorkflowService] Failed to delete from backend:', error);
    }
  }

  // ==========================================================================
  // Execution Persistence (LocalStorage)
  // ==========================================================================

  private async loadExecutions(): Promise<void> {
    // 1. Load from LocalStorage first
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('skhoot_workflow_executions');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((ctx: ExecutionContext) => {
               this.executions.set(ctx.executionId, ctx);
            });
          }
        }
      } catch (e) {
        console.error('[WorkflowService] Failed to load executions from storage:', e);
      }
    }

    // 2. Sync active executions from backend
    try {
      const response = await fetch(`${backendApi.baseUrl}/workflows/executions/active`);
      if (response.ok) {
        const active = await response.json();
        active.forEach((ctx: ExecutionContext) => {
          // Normalize backend field names (snake_case to camelCase) if necessary
          // Our backend uses serde default which is usually snake_case for Rust
          // but ExecutionContext in TS expects camelCase.
          const normalized: ExecutionContext = {
            workflowId: (ctx as any).workflow_id || ctx.workflowId,
            executionId: (ctx as any).execution_id || ctx.executionId,
            currentStepId: (ctx as any).current_step_id || ctx.currentStepId,
            variables: ctx.variables,
            stepResults: (ctx as any).step_results || ctx.stepResults,
            startedAt: (ctx as any).started_at || ctx.startedAt,
            completedAt: (ctx as any).completed_at || ctx.completedAt,
            status: ctx.status,
            loopState: (ctx as any).loop_state || ctx.loopState
          };
          this.executions.set(normalized.executionId, normalized);
        });
        this.emit('execution_updated', { context: null });
      }
    } catch (error) {
      console.warn('[WorkflowService] Failed to sync active executions from backend', error);
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
    // Proactively sync from backend to ensure latest list
    try {
      const response = await fetch(`${backendApi.baseUrl}/workflows`);
      if (response.ok) {
        const workflows = await response.json();
        workflows.forEach((wf: Workflow) => {
          this.workflows.set(wf.id, wf);
        });
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.warn('[WorkflowService] Background sync failed during list()', error);
    }
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
    try {
      const response = await fetch(`${backendApi.baseUrl}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        const created = await response.json();
        this.workflows.set(created.id, created);
        this.saveToLocalStorage();
        this.emit('workflow_created', { workflow: created });
        return created;
      }
    } catch (e) {
      console.error('[WorkflowService] Failed to create workflow on backend:', e);
    }

    // Fallback if backend creation failed
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

  async execute(workflowId: string, variables: Record<string, any> = {}, agentSessionId?: string): Promise<ExecutionContext> {
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

    // Initialize Executor
    const executor = new WorkflowExecutor(workflow, context, agentSessionId);
    this.executors.set(executionId, executor);

    // Bind events
    executor.on('step_start', (data: any) => {
        this.emit('step_start', data);
        window.dispatchEvent(new CustomEvent('workflow-step-start', { detail: { ...data, executionId, workflow } }));
        // Update local context reference and save
        this.executions.set(executionId, data.context);
        this.saveExecutions();
        this.emit('execution_updated', { context: data.context });
    });

    executor.on('step_complete', (data: any) => {
        this.emit('step_completed', { context: data.context, stepResult: data.result, nextStepId: data.nextStepId });
        
        // Dispatch event to continue workflow (UI updates)
        window.dispatchEvent(new CustomEvent('workflow-step-next', {
          detail: {
            executionId,
            workflow,
            context: data.context,
            currentStep: workflow.steps.find(s => s.id === data.nextStepId),
            previousResult: data.result,
          }
        }));
        
        // Update local context reference and save
        this.executions.set(executionId, data.context);
        this.saveExecutions();
        this.emit('execution_updated', { context: data.context });
    });

    executor.on('waiting_for_input', (data: any) => {
        window.dispatchEvent(new CustomEvent('workflow-input-request', { detail: { ...data, executionId, workflow } }));
        this.saveExecutions();
    });

    executor.on('status_update', (data: any) => {
        window.dispatchEvent(new CustomEvent('workflow-status-update', { detail: { ...data, executionId } }));
    });

    executor.on('workflow_complete', (data: any) => {
        this.update(workflowId, {
          status: 'idle',
          runCount: workflow.runCount + 1,
          lastRun: Date.now(),
        });
        
        this.emit('execution_completed', { context: data.context, workflow });
        
        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('workflow-completed', {
          detail: { executionId, context: data.context, workflow }
        }));
        
        this.executors.delete(executionId);
        this.saveExecutions();
    });
    
    executor.on('workflow_failed', (data: any) => {
        this.update(workflowId, { status: 'idle' });
        // Use completion event but context status is failed
        window.dispatchEvent(new CustomEvent('workflow-completed', { detail: { executionId, context: data.context, workflow } }));
        this.executors.delete(executionId);
        this.saveExecutions();
    });

    executor.on('execution_cancelled', (data: any) => {
        this.update(workflowId, { status: 'idle' });
        this.emit('execution_cancelled', { context: data.context });
        window.dispatchEvent(new CustomEvent('workflow-completed', { detail: { executionId, context: data.context, workflow } }));
        this.executors.delete(executionId);
        this.saveExecutions();
    });

    // Start execution with a small delay to allow UI to setup listeners and state
    setTimeout(() => {
        executor.start();
    }, 500);
    
    return context;
  }

  async resumeExecution(executionId: string, input: string): Promise<void> {
    const executor = this.executors.get(executionId);
    if (executor) {
        executor.resume(input);
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const executor = this.executors.get(executionId);
    if (executor) {
       executor.cancel();
    } else {
       const context = this.executions.get(executionId);
       if (context) {
         context.status = 'cancelled';
         context.completedAt = Date.now();
         await this.update(context.workflowId, { status: 'idle' });
         this.saveExecutions();
         this.emit('execution_cancelled', { context });
       }
    }
  }

  async updateExecutionState(context: ExecutionContext): Promise<void> {
    this.executions.set(context.executionId, context);
    this.saveExecutions();
    
    // Emit event for UI updates
    this.emit('execution_updated', { context });
    
    try {
      await fetch(`${backendApi.baseUrl}/workflows/executions/${context.executionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
    } catch (error) {
      console.warn('[WorkflowService] Failed to sync execution with backend:', error);
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
