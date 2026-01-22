import React, { memo, useState } from 'react';
import { Play, CheckCircle2, Circle, Loader2, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Message } from '../../types';
import { workflowService } from '../../services/workflowService';

interface WorkflowProgressProps {
  message: Message;
}

export const WorkflowProgress = memo<WorkflowProgressProps>(({ message }) => {
  const { workflowExecution } = message;
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!workflowExecution) return null;
  
  const { executionId, workflowName, currentStep, status, totalSteps } = workflowExecution;
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isRunning = status === 'running';
  const isWaiting = status === 'waiting';
  const isCancelled = status === 'cancelled';

  // Calculate progress
  const progress = currentStep && totalSteps 
    ? Math.round(((currentStep.order - 1) / totalSteps) * 100) 
    : isCompleted ? 100 : 0;

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    workflowService.cancelExecution(executionId);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className="w-full max-w-xl bg-[#1E1E2E]/80 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden shadow-lg mb-4 transition-all duration-300 hover:border-purple-500/30 cursor-pointer"
      onClick={toggleExpand}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${
            isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 
            isFailed ? 'bg-red-500/20 text-red-400' : 
            isCancelled ? 'bg-gray-500/20 text-gray-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {isCompleted ? <CheckCircle2 size={14} /> : 
             isFailed ? <AlertCircle size={14} /> : 
             isCancelled ? <XCircle size={14} /> :
             <Play size={14} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">{workflowName}</h4>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              {isCompleted ? 'Completed' : 
               isFailed ? 'Failed' : 
               isCancelled ? 'Cancelled' :
               isWaiting ? 'Waiting for Input' : 'Running Workflow...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
             <div className="flex items-center gap-2">
               <Loader2 size={14} className="text-purple-400 animate-spin" />
               <button 
                 onClick={handleCancel}
                 className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                 title="Cancel Workflow"
               >
                 <XCircle size={14} />
               </button>
             </div>
          )}
          <div className="text-gray-500">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-black/40">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            isCompleted ? 'bg-emerald-500' : 
            isFailed ? 'bg-red-500' : 
            isCancelled ? 'bg-gray-500' :
            'bg-purple-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <div className="p-3">
        {isCompleted ? (
           <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
             <CheckCircle2 size={12} />
             <span>All steps completed successfully</span>
           </div>
        ) : isFailed ? (
           <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
             <AlertCircle size={12} />
             <span>Workflow execution failed</span>
           </div>
        ) : isCancelled ? (
           <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
             <XCircle size={12} />
             <span>Workflow stopped by user</span>
           </div>
        ) : currentStep ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse absolute inset-0 m-auto" />
                <Circle size={14} className="text-purple-500/50" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Current Step {currentStep.order}/{totalSteps || '?'}</p>
                <p className="text-sm text-white font-medium">{currentStep.name}</p>
              </div>
            </div>
            {isWaiting && (
               <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wider animate-pulse">
                 Input Required
               </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Initializing...</p>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Workflow Details</p>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Execution ID:</span>
                <span className="font-mono text-gray-500">{executionId.split('-')[1] || executionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Steps:</span>
                <span>{totalSteps}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`capitalize ${isCompleted ? 'text-emerald-400' : isRunning ? 'text-purple-400' : 'text-gray-400'}`}>{status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WorkflowProgress.displayName = 'WorkflowProgress';
