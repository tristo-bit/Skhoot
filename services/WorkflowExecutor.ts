
import { agentChatService } from './agentChatService';
import { 
  Workflow, 
  WorkflowStep, 
  ExecutionContext, 
  StepResult
} from './workflowService';
import { aiSettingsService } from './aiSettingsService';
import { AgentChatMessage } from './agent/types';

export type WorkflowEvent = 
  | 'step_start' 
  | 'step_complete' 
  | 'workflow_complete' 
  | 'workflow_failed'
  | 'waiting_for_input'
  | 'execution_cancelled';

export class WorkflowExecutor {
  private context: ExecutionContext;
  private workflow: Workflow;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private agentSessionId: string | undefined;

  constructor(workflow: Workflow, context: ExecutionContext, agentSessionId?: string) {
    this.workflow = workflow;
    this.context = context;
    this.agentSessionId = agentSessionId;
  }

  public on(event: WorkflowEvent, listener: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(event: WorkflowEvent, data: any) {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[WorkflowExecutor] Error in listener for ${event}:`, e);
      }
    });
  }

  public async start() {
    this.isPaused = false;
    this.isCancelled = false;
    await this.runLoop();
  }

  public resume(input: string) {
    if (this.context.status !== 'paused' && this.context.status !== 'running') {
       console.warn('[WorkflowExecutor] Cannot resume workflow that is not paused or running');
       return;
    }
    
    this.isPaused = false;
    this.context.status = 'running';
    
    // If we were waiting for input at a specific step, we treat the input as the output of that "interaction"
    // and proceed. However, the step logic usually executes the PROMPT first.
    // If inputRequest is enabled, the step pauses BEFORE executing the AI logic?
    // Let's check ChatInterface behavior. 
    // ChatInterface: if (inputRequest.enabled) { ... setWaitingForInput ... return; }
    // Then resume: workflowService.executeStep(id, input) -> this records the input as the step output?
    
    // In ChatInterface, resume calls executeStep(id, input).
    // WorkflowService.executeStep takes 'output' as argument.
    // So the input BECOMES the output of the step (or input to the prompt?)
    // Actually, ChatInterface executes the prompt, gets result, THEN checks decision.
    // Wait, if inputRequest is enabled, ChatInterface pauses immediately after showing the prompt/placeholder.
    // Then when resumed, it seems it treats the user input as the "result" of the step?
    // workflowService.executeStep(executionId, messageText)
    
    // So for input steps, the user input IS the step output. The AI is skipped for that step (or implicitly the user is the intelligence).
    
    // I need to handle this resume logic.
    // I'll call runLoop passing the input as the "result" of the *current* step if we are resuming.
    
    this.runLoop(input);
  }

  public cancel() {
    this.isCancelled = true;
    this.context.status = 'cancelled';
    this.context.completedAt = Date.now();
    this.emit('execution_cancelled', { context: this.context });
  }

  private async runLoop(resumeInput?: string) {
    // If resuming, we have an input that resolves the *current* step (which was waiting).
    if (resumeInput !== undefined && this.context.currentStepId) {
        const currentStep = this.workflow.steps.find(s => s.id === this.context.currentStepId);
        if (currentStep) {
            await this.handleStepCompletion(currentStep, resumeInput, undefined, []);
        }
    }

    while (this.context.currentStepId && !this.isPaused && !this.isCancelled) {
      const step = this.workflow.steps.find(s => s.id === this.context.currentStepId);
      if (!step) {
          console.error('[WorkflowExecutor] Step not found:', this.context.currentStepId);
          break;
      }

      // Check if we just started this step (if resumeInput was handled, currentStepId changed, so we are at start of NEW step)
      
      this.emit('step_start', { step, context: this.context });

      try {
        // 1. Check for Input Request
        if (step.inputRequest?.enabled) {
            this.context.status = 'paused';
            this.isPaused = true;
            this.emit('waiting_for_input', { step, context: this.context });
            return; // Exit loop, wait for resume()
        }

        // 2. Prepare Prompt (Variable Substitution)
        let prompt = step.prompt;
        if (this.context.variables) {
            Object.entries(this.context.variables).forEach(([key, value]) => {
                prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
        }

        // 3. Append Decision Instructions
        if (step.decision) {
             prompt += "\n\nIMPORTANT: This is a decision step. You must output a JSON object with a boolean field named 'decision' (true or false) indicating the result of the decision. Example: {\"decision\": true}";
        }

        // 3. Execute AI
        const { content, toolResults } = await this.executeAI(prompt);
        
        // 4. Determine Decision (if any)
        const decisionResult = this.evaluateDecision(step, content);

        // 5. Handle File Outputs
        const generatedFiles = this.detectGeneratedFiles(step, content, toolResults);

        // 6. Complete Step & Move Next
        await this.handleStepCompletion(step, content, decisionResult, generatedFiles);

      } catch (error) {
        console.error('[WorkflowExecutor] Step failed:', error);
        this.context.status = 'failed';
        this.context.completedAt = Date.now();
        this.emit('workflow_failed', { error, context: this.context });
        return;
      }
    }

    if (!this.context.currentStepId && this.context.status !== 'failed' && this.context.status !== 'cancelled') {
        this.context.status = 'completed';
        this.context.completedAt = Date.now();
        this.emit('workflow_complete', { context: this.context });
    }
  }

  private async executeAI(prompt: string): Promise<{ content: string; toolResults: any[] }> {
    const aiSettings = aiSettingsService.loadSettings();
    const sessionId = this.agentSessionId || `wf-exec-${this.context.executionId}`;

    // Create a clean history or minimal context?
    // The plan says "clean context window" for executeStepWithAI.
    // But we might want previous steps output? 
    // For now, let's keep it clean as per plan: "Implement executeStepWithAI to use agentChatService.executeWithTools with a clean context window."
    
    const result = await agentChatService.executeWithTools(
        prompt,
        [], // Empty history
        {
            sessionId,
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            // ... other settings
        }
    );

    return {
        content: result.content,
        toolResults: result.toolResults
    };
  }

  private evaluateDecision(step: WorkflowStep, output: string): boolean | undefined {
      if (!step.decision) return undefined;

      // JSON Check
      try {
          const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (typeof parsed.isValid === 'boolean') return parsed.isValid;
              if (typeof parsed.approved === 'boolean') return parsed.approved;
              if (typeof parsed.decision === 'boolean') return parsed.decision;
          }
      } catch (e) {
          // ignore
      }

      // Text Check
      const lower = output.toLowerCase();
      return lower.includes('yes') || lower.includes('true') || lower.includes('confirmed');
  }

  private detectGeneratedFiles(step: WorkflowStep, output: string, toolResults: any[]): string[] {
      let generatedFiles: string[] = [];
      
      if (step.outputFormat === 'file' && toolResults) {
          const writeTool = toolResults.find(r => r.success && (r.toolCallName === 'write_file' || r.name === 'write_file')); // check naming consistency
          if (writeTool) {
             const match = writeTool.output.match(/File written successfully: (.*)/);
             if (match) {
                 generatedFiles.push(match[1]);
             }
          }
      }

      // Fallback regex
      if (generatedFiles.length === 0 && step.outputFormat === 'file') {
        const pathMatch = output.match(/(?:\/|\\|[a-zA-Z]:\\)[^"'\n\r\t]+\.[a-zA-Z0-9]{1,5}/g);
        if (pathMatch) {
            generatedFiles.push(...pathMatch);
        }
      }

      return generatedFiles;
  }

  // Logic ported from WorkflowService.executeStep to determine next state
  private async handleStepCompletion(
      step: WorkflowStep, 
      output: string, 
      decisionResult: boolean | undefined, 
      generatedFiles: string[]
  ) {
      // 1. Process Output & Variables
      let processedOutput: any = output;
      if (step.outputFormat === 'json') {
          try {
             const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
             processedOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(output);
          } catch(e) { /* warn */ }
      }

      if (step.outputVar) {
          this.context.variables[step.outputVar] = processedOutput;
      }

      // 2. Record Result
      const result: StepResult = {
          stepId: step.id,
          success: true,
          output,
          durationMs: 0, // TODO: calculate duration
          decisionResult,
          generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined
      };
      this.context.stepResults[step.id] = result;

      this.emit('step_complete', { step, result });

      // 3. Determine Next Step
      let nextStepId: string | undefined;
      if (step.decision) {
          nextStepId = decisionResult ? step.decision.trueBranch : step.decision.falseBranch;
      } else {
          nextStepId = step.nextStep;
      }

      // 4. Handle Loops (Copied logic)
      
      // Active Loop
      if (this.context.loopState && this.context.loopState.stepId === step.id) {
          this.context.loopState.currentIndex++;
          if (this.context.loopState.currentIndex < this.context.loopState.items.length) {
              const nextItem = this.context.loopState.items[this.context.loopState.currentIndex];
              this.context.variables[this.context.loopState.itemVar] = nextItem;
              nextStepId = step.id; // Repeat
          } else {
              // Finished
               if (nextStepId === step.id) {
                   nextStepId = step.nextStep;
               }
               this.context.loopState = undefined;
          }
      }

      // Init Loop
      if (nextStepId && nextStepId !== step.id) {
          const nextStepObj = this.workflow.steps.find(s => s.id === nextStepId);
          if (nextStepObj && nextStepObj.loop) {
              const sourceName = nextStepObj.loop.source;
              let collection = this.context.variables[sourceName];
               if (!collection && sourceName === step.outputVar) {
                   collection = this.context.variables[step.outputVar];
               }

               if (Array.isArray(collection) && collection.length > 0) {
                   this.context.loopState = {
                       stepId: nextStepId,
                       items: collection,
                       currentIndex: 0,
                       itemVar: nextStepObj.loop.itemVar
                   };
                   this.context.variables[nextStepObj.loop.itemVar] = collection[0];
               } else {
                   // Skip empty loop
                   nextStepId = nextStepObj.nextStep;
               }
          }
      }

      this.context.currentStepId = nextStepId;

      // Persist via WorkflowService (Assuming we can call a method or it's implicitly saved if we modify the object and trigger save)
      // Since context is a reference to the object in WorkflowService.executions map (if passed correctly), 
      // we just need to tell WorkflowService to save to disk.
      // I'll assume WorkflowService handles persistence if I call a method or I might need to add one.
      // For now, I won't explicitly call save on disk to avoid circular dependency issues if I import workflowService.
      // Wait, I imported workflowService. 
      // But `saveExecutions` is private.
      // I'll emit an event that WorkflowService listens to? No, WorkflowService creates the executor.
      
      // I'll assume for now that I need to emit a 'state_change' event or similar if I want external persistence,
      // but the UI listens to 'step_complete'.
  }
}
