
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
  | 'execution_cancelled'
  | 'status_update';

export class WorkflowExecutor {
  private context: ExecutionContext;
  private workflow: Workflow;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private abortController: AbortController | null = null;
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
    if (this.abortController) {
        this.abortController.abort();
    }
    this.context.status = 'cancelled';
    this.context.completedAt = Date.now();
    this.emit('execution_cancelled', { context: this.context });
  }

  private async runLoop(resumeInput?: string) {
    // If resuming, we have an input that resolves the *current* step (which was waiting).
    if (resumeInput !== undefined && this.context.currentStepId) {
        const currentStep = this.workflow.steps.find(s => s.id === this.context.currentStepId);
        if (currentStep && !this.isCancelled) {
            await this.handleStepCompletion(currentStep, resumeInput, undefined, []);
        }
    }

    while (this.context.currentStepId && !this.isPaused && !this.isCancelled) {
      const step = this.workflow.steps.find(s => s.id === this.context.currentStepId);
      if (!step) {
          console.error('[WorkflowExecutor] Step not found:', this.context.currentStepId);
          break;
      }

      this.emit('step_start', { step, context: this.context });

      try {
        // 1. Check for Input Request
        if (step.inputRequest?.enabled) {
            this.context.status = 'paused';
            this.isPaused = true;
            this.emit('waiting_for_input', { step, context: this.context });
            return; // Exit loop, wait for resume()
        }

        if (this.isCancelled) break;

        // 2. Prepare Prompt (Variable Substitution)
        let prompt = step.prompt;
        if (this.context.variables) {
            Object.entries(this.context.variables).forEach(([key, value]) => {
                const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), valStr);
                prompt = prompt.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), valStr);
            });
        }

        // 3. Append Decision Instructions
        if (step.decision) {
             prompt += "\n\nIMPORTANT: This is a decision step. You must output a JSON object with a boolean field named 'decision' (true or false) indicating the result of the decision. Example: {\"decision\": true}";
        }

        // 4. Execute AI
        const { content, toolResults, generatedFiles: stepGeneratedFiles, displayImages } = await this.executeAI(prompt);
        
        // CHECK FOR CANCELLATION IMMEDIATELY AFTER AI EXECUTION
        if (this.isCancelled) {
            console.log('[WorkflowExecutor] Workflow cancelled during AI execution, stopping.');
            return;
        }

        // 5. Determine Decision (if any)
        const decisionResult = this.evaluateDecision(step, content);

        // 6. Handle File Outputs
        const detectedFiles = this.detectGeneratedFiles(step, content, toolResults);
        const allGeneratedFiles = Array.from(new Set([...detectedFiles, ...(stepGeneratedFiles || [])]));

        // 7. Complete Step & Move Next
        if (!this.isCancelled) {
            await this.handleStepCompletion(step, content, decisionResult, allGeneratedFiles, displayImages);
        }

      } catch (error) {
        if (this.isCancelled) return; // Ignore errors if already cancelled
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

  private async executeAI(prompt: string): Promise<{ content: string; toolResults: any[]; generatedFiles?: string[]; displayImages?: any[] }> {
    const aiSettings = aiSettingsService.loadSettings();
    // Use a truly unique session ID for this workflow execution to avoid chat pollution
    const sessionId = this.agentSessionId || `workflow-exec-${this.context.executionId}`;

    console.log(`[WorkflowExecutor] Executing AI step with isolated session: ${sessionId}`);
    
    // Accumulate history from previous steps to maintain context
    const workflowHistory: AgentChatMessage[] = [];
    
    // Sort steps by order to ensure chronological history
    const sortedSteps = [...this.workflow.steps].sort((a, b) => a.order - b.order);
    
    for (const s of sortedSteps) {
        const result = this.context.stepResults[s.id];
        if (result && result.success) {
            // Add user prompt and assistant response for each completed step
            workflowHistory.push({ role: 'user', content: s.prompt });
            workflowHistory.push({ role: 'assistant', content: result.output });
        }
    }

    // Initialize AbortController for this AI call
    this.abortController = new AbortController();

    try {
        const result = await agentChatService.executeWithTools(
            prompt,
            workflowHistory, // Pass accumulated history instead of empty array
            {
                sessionId,
                temperature: aiSettings.temperature,
                maxTokens: aiSettings.maxTokens,
                abortSignal: this.abortController.signal, // Pass the signal
                onStatusUpdate: (status) => {
                    this.emit('status_update', { status });
                }
            }
        );

        return {
            content: result.content,
            toolResults: result.toolResults,
            generatedFiles: result.generatedFiles,
            displayImages: result.displayImages // Bubble up images from tool calls
        };
    } finally {
        this.abortController = null;
    }
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
      
      // 1. Check Tool Results for explicit markers (from write_file or shell detection)
      if (toolResults) {
          toolResults.forEach(r => {
              if (r.success) {
                  // Direct write_file marker
                  if (r.toolCallName === 'write_file' || r.name === 'write_file') {
                      const match = r.output?.match(/File written successfully: (.*)/);
                      if (match) generatedFiles.push(match[1]);
                  }
                  
                  // Also check for tagged files from our recent detection logic
                  // Note: the original toolCall was tagged, but we only have results here.
                  // Wait, agentChatService returns result.generatedFiles which we already use.
              }
          });
      }

      // 2. Fallback to path detection in AI output if file format was expected
      if (step.outputFormat === 'file') {
        const pathMatch = output.match(/(?:\/|\\|[a-zA-Z]:\\)[^"'\n\r\t ]+\.[a-zA-Z0-9]{1,5}/g);
        if (pathMatch) {
            const localPaths = pathMatch.filter(p => !p.startsWith('http') && !p.includes('://') && !p.startsWith('//'));
            generatedFiles.push(...localPaths);
        }
      }

      return Array.from(new Set(generatedFiles));
  }

  // Logic ported from WorkflowService.executeStep to determine next state
    private async handleStepCompletion(
        step: WorkflowStep, 
        output: string, 
        decisionResult: boolean | undefined, 
        generatedFiles: string[],
        displayImages?: any[]
    ) {
        if (this.isCancelled) return;

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

      this.emit('step_complete', { step, result, displayImages });

      // 3. Determine Next Step
      let nextStepId: string | undefined;
      if (step.decision) {
          nextStepId = decisionResult ? step.decision.trueBranch : step.decision.falseBranch;
      } else {
          nextStepId = step.nextStep;
      }

      // 4. Handle Loops
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

      // Fallback to next step by order if no explicit nextStepId
      if (!nextStepId) {
          const nextStep = this.workflow.steps
              .filter(s => s.order > step.order)
              .sort((a, b) => a.order - b.order)[0];
          if (nextStep) {
              nextStepId = nextStep.id;
          }
      }

      this.context.currentStepId = nextStepId;

      // Notify step start immediately for UI updates
      if (nextStepId) {
          const nextStep = this.workflow.steps.find(s => s.id === nextStepId);
          if (nextStep) {
              this.emit('step_start', { step: nextStep, context: this.context });
          }
      }

      // Sync with backend if possible
      try {
          const { workflowService } = await import('./workflowService');
          await workflowService.updateExecutionState(this.context);
      } catch (e) {
          console.warn('[WorkflowExecutor] Failed to sync execution state with backend:', e);
      }
  }
}
