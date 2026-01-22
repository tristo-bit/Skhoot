
import React, { useState } from 'react';
import { Message } from '../../types';
import { WorkflowProgress } from './WorkflowProgress';
import { WorkflowInputForm } from './WorkflowInputForm';
import { File as FileIcon } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

interface UnifiedWorkflowMessageProps {
  message: Message;
}

export const UnifiedWorkflowMessage: React.FC<UnifiedWorkflowMessageProps> = ({ 
  message
}) => {
  const { content, workflowExecution, inputRequest, completion } = message;

  if (!workflowExecution) return null;

  const onResume = (executionId: string, input: string) => {
      workflowService.resumeExecution(executionId, input);
  };
  
  const onCancel = (executionId: string) => {
      workflowService.cancelExecution(executionId);
  };

  const isWaiting = workflowExecution.status === 'waiting' || workflowExecution.status === 'paused';

  return (
    <div className="flex flex-col gap-3 my-2 max-w-xl w-full">
       {/* 1. Intro Text */}
       {content && (
         <div className="text-gray-300 text-sm whitespace-pre-wrap">
           {content}
         </div>
       )}

       {/* 2. Unified Workflow Card */}
       <WorkflowProgress message={message} />

       {/* 3. Input Zone */}
       {inputRequest && isWaiting && (
          <div className="mt-2 p-4 bg-[#1E1E2E] rounded-xl border border-amber-500/30 shadow-lg animate-in fade-in slide-in-from-top-2">
             <WorkflowInputForm 
                prompt={inputRequest.prompt} 
                onSubmit={(value) => onResume(workflowExecution.executionId, value)}
                onCancel={() => onCancel(workflowExecution.executionId)}
             />
          </div>
       )}

       {/* 4. Output Text */}
       {completion?.text && (
          <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 text-gray-200 text-sm whitespace-pre-wrap">
             {completion.text}
          </div>
       )}

       {/* 5. Artifacts */}
       {completion?.artifacts && completion.artifacts.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
             <span className="text-xs font-bold text-gray-500 uppercase">Generated Artifacts</span>
             {completion.artifacts.map((artifact, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                   <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded">
                      <FileIcon size={14} />
                   </div>
                   <span className="text-xs text-gray-300 font-mono truncate">
                      {typeof artifact === 'string' ? artifact : (artifact.name || artifact.path || 'Unknown File')}
                   </span>
                </div>
             ))}
          </div>
       )}
    </div>
  );
};
