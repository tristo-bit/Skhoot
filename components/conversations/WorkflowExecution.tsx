/**
 * WorkflowExecution - Displays workflow execution progress in chat
 * Handles step-by-step AI interaction with decision branching
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Workflow, Play, CheckCircle, XCircle, 
  ChevronRight, GitBranch, Loader2, AlertCircle,
  ThumbsUp, ThumbsDown
} from 'lucide-react';
import { 
  workflowService, 
  Workflow as WorkflowType, 
  WorkflowStep,
  ExecutionContext,
  StepResult
} from '../../services/workflowService';

interface WorkflowExecutionProps {
  executionId: string;
  workflow: WorkflowType;
  onSendPrompt: (prompt: string) => Promise<string>;
  onComplete?: (context: ExecutionContext) => void;
  hasAgentMode?: boolean;
}

interface StepState {
  step: WorkflowStep;
  status: 'pending' | 'running' | 'waiting_confirmation' | 'completed' | 'failed';
  output?: string;
  decisionResult?: boolean;
}

export const WorkflowExecution = memo<WorkflowExecutionProps>(({ 
  executionId, 
  workflow, 
  onSendPrompt,
  onComplete,
  hasAgentMode = false
}) => {
  const [stepStates, setStepStates] = useState<Map<string, StepState>>(new Map());
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize step states
  useEffect(() => {
    const states = new Map<string, StepState>();
    workflow.steps.forEach(step => {
      states.set(step.id, { step, status: 'pending' });
    });
    setStepStates(states);
    
    // Start with first step
    const firstStep = workflow.steps.find(s => s.order === 1);
    if (firstStep) {
      setCurrentStepId(firstStep.id);
    }
  }, [workflow]);

  // Execute current step
  const executeStep = useCallback(async (stepId: string) => {
    const stepState = stepStates.get(stepId);
    if (!stepState) return;

    const { step } = stepState;

    // Update status to running
    setStepStates(prev => {
      const next = new Map(prev);
      next.set(stepId, { ...stepState, status: 'running' });
      return next;
    });

    try {
      // Build the prompt with context
      const contextPrompt = `[Workflow: ${workflow.name}]
[Step ${step.order}: ${step.name}]

${step.prompt}

${step.outputFormat ? `Expected output format: ${step.outputFormat}` : ''}`;

      // Send to AI and get response
      const response = await onSendPrompt(contextPrompt);

      // Check if step requires confirmation
      if (step.requiresConfirmation) {
        setStepStates(prev => {
          const next = new Map(prev);
          next.set(stepId, { 
            ...stepState, 
            status: 'waiting_confirmation',
            output: response 
          });
          return next;
        });
      } else {
        // Complete the step
        await completeStep(stepId, response);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Step execution failed';
      setError(errorMsg);
      setStepStates(prev => {
        const next = new Map(prev);
        next.set(stepId, { ...stepState, status: 'failed', output: errorMsg });
        return next;
      });
      setIsRunning(false);
    }
  }, [stepStates, workflow, onSendPrompt]);

  // Complete a step and move to next
  const completeStep = useCallback(async (stepId: string, output: string, decisionResult?: boolean) => {
    const stepState = stepStates.get(stepId);
    if (!stepState) return;

    // Update step state
    setStepStates(prev => {
      const next = new Map(prev);
      next.set(stepId, { 
        ...stepState, 
        status: 'completed',
        output,
        decisionResult 
      });
      return next;
    });

    // Execute step in workflow service to get next step
    const { nextStepId, completed } = await workflowService.executeStep(
      executionId,
      output,
      decisionResult
    );

    if (completed) {
      setIsRunning(false);
      setCurrentStepId(null);
      const context = workflowService.getExecution(executionId);
      if (context) {
        onComplete?.(context);
      }
    } else if (nextStepId) {
      setCurrentStepId(nextStepId);
    }
  }, [stepStates, executionId, onComplete]);

  // Handle decision for steps with branching
  const handleDecision = useCallback(async (stepId: string, decision: boolean) => {
    const stepState = stepStates.get(stepId);
    if (!stepState || !stepState.output) return;

    await completeStep(stepId, stepState.output, decision);
  }, [stepStates, completeStep]);

  // Handle confirmation
  const handleConfirm = useCallback(async (stepId: string, confirmed: boolean) => {
    const stepState = stepStates.get(stepId);
    if (!stepState || !stepState.output) return;

    if (confirmed) {
      await completeStep(stepId, stepState.output);
    } else {
      // Mark as failed/cancelled
      setStepStates(prev => {
        const next = new Map(prev);
        next.set(stepId, { ...stepState, status: 'failed', output: 'Cancelled by user' });
        return next;
      });
      setIsRunning(false);
    }
  }, [stepStates, completeStep]);

  // Auto-execute current step when it changes
  useEffect(() => {
    if (currentStepId && isRunning) {
      const stepState = stepStates.get(currentStepId);
      if (stepState?.status === 'pending') {
        executeStep(currentStepId);
      }
    }
  }, [currentStepId, isRunning, stepStates, executeStep]);

  // Get ordered steps for display
  const orderedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-purple-500/20 bg-purple-500/10">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Workflow size={16} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{workflow.name}</p>
          <p className="text-xs text-text-secondary">{workflow.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Agent Mode Indicator */}
          {hasAgentMode ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-medium" title="Agent mode enabled - workflow has tool access">
              <Play size={10} />
              Agent
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 text-[10px] font-medium" title="No agent mode - limited to text responses">
              <AlertCircle size={10} />
              No Tools
            </span>
          )}
          {isRunning ? (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
              <Loader2 size={12} className="animate-spin" />
              Running
            </span>
          ) : error ? (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
              <XCircle size={12} />
              Failed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle size={12} />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="p-3 space-y-2">
        {orderedSteps.map((step, index) => {
          const state = stepStates.get(step.id);
          if (!state) return null;

          return (
            <StepDisplay
              key={step.id}
              step={step}
              state={state}
              index={index}
              isLast={index === orderedSteps.length - 1}
              onDecision={(decision) => handleDecision(step.id, decision)}
              onConfirm={(confirmed) => handleConfirm(step.id, confirmed)}
            />
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
});

WorkflowExecution.displayName = 'WorkflowExecution';

// Step display component
const StepDisplay = memo<{
  step: WorkflowStep;
  state: StepState;
  index: number;
  isLast: boolean;
  onDecision: (decision: boolean) => void;
  onConfirm: (confirmed: boolean) => void;
}>(({ step, state, index, isLast, onDecision, onConfirm }) => {
  const statusIcons = {
    pending: <div className="w-2 h-2 rounded-full bg-gray-400" />,
    running: <Loader2 size={14} className="text-amber-400 animate-spin" />,
    waiting_confirmation: <AlertCircle size={14} className="text-amber-400" />,
    completed: <CheckCircle size={14} className="text-emerald-400" />,
    failed: <XCircle size={14} className="text-red-400" />,
  };

  const statusColors = {
    pending: 'border-gray-500/30 bg-gray-500/5',
    running: 'border-amber-500/30 bg-amber-500/5',
    waiting_confirmation: 'border-amber-500/30 bg-amber-500/5',
    completed: 'border-emerald-500/30 bg-emerald-500/5',
    failed: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div 
          className="absolute left-4 top-10 w-0.5 h-full -mb-2"
          style={{ 
            background: state.status === 'completed' 
              ? 'linear-gradient(to bottom, rgb(52, 211, 153), rgb(107, 114, 128))' 
              : 'rgb(107, 114, 128, 0.3)' 
          }}
        />
      )}

      <div className={`relative rounded-lg border p-3 ${statusColors[state.status]}`}>
        <div className="flex items-start gap-3">
          {/* Step number */}
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            {statusIcons[state.status]}
          </div>

          <div className="flex-1 min-w-0">
            {/* Step header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-text-secondary">Step {index + 1}</span>
              {step.decision && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <GitBranch size={10} />
                  Decision
                </span>
              )}
            </div>

            {/* Step name */}
            <p className="text-sm font-medium text-text-primary mb-1">{step.name}</p>

            {/* Step prompt (collapsed) */}
            <p className="text-xs text-text-secondary line-clamp-2">{step.prompt}</p>

            {/* Output (if completed or waiting) */}
            {state.output && (state.status === 'completed' || state.status === 'waiting_confirmation') && (
              <div className="mt-2 p-2 rounded-lg bg-white/5 text-xs text-text-primary max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono">{state.output.slice(0, 500)}{state.output.length > 500 ? '...' : ''}</pre>
              </div>
            )}

            {/* Decision buttons */}
            {state.status === 'completed' && step.decision && state.decisionResult === undefined && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-text-secondary mr-2">{step.decision.condition}</p>
                <button
                  onClick={() => onDecision(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                >
                  <ThumbsUp size={12} />
                  Yes
                </button>
                <button
                  onClick={() => onDecision(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"
                >
                  <ThumbsDown size={12} />
                  No
                </button>
              </div>
            )}

            {/* Confirmation buttons */}
            {state.status === 'waiting_confirmation' && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-amber-400 mr-2">Confirm to proceed?</p>
                <button
                  onClick={() => onConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                >
                  <CheckCircle size={12} />
                  Confirm
                </button>
                <button
                  onClick={() => onConfirm(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"
                >
                  <XCircle size={12} />
                  Cancel
                </button>
              </div>
            )}

            {/* Decision result indicator */}
            {state.decisionResult !== undefined && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <GitBranch size={10} className="text-purple-400" />
                <span className="text-text-secondary">
                  Decision: {state.decisionResult ? 'Yes' : 'No'} → {
                    state.decisionResult 
                      ? step.decision?.trueBranch || 'Continue'
                      : step.decision?.falseBranch || 'Continue'
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

StepDisplay.displayName = 'StepDisplay';

export default WorkflowExecution;
