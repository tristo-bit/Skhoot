/**
 * Loading Animations for Tool Calls
 * 
 * Wraps the Framer Motion animations for use as loading components in the registry
 */

import React, { memo } from 'react';
import { ToolCallLoadingProps } from '../registry/types';
import { AnimationFileOperations } from '../AnimationFileOperations';
import { AnimationCommandExecution } from '../AnimationCommandExecution';
import { AnimationSearchDiscovery } from '../AnimationSearchDiscovery';
import { AnimationWebAccess } from '../AnimationWebAccess';
import { AnimationCodeAnalysis } from '../AnimationCodeAnalysis';
import { AnimationAgentOperations } from '../AnimationAgentOperations';

// File Operations Loading
export const FileOperationsLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationFileOperations isProcessing={true} />
      </div>
    </div>
  );
});
FileOperationsLoading.displayName = 'FileOperationsLoading';

// Command Execution Loading
export const CommandExecutionLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationCommandExecution isProcessing={true} />
      </div>
    </div>
  );
});
CommandExecutionLoading.displayName = 'CommandExecutionLoading';

// Search & Discovery Loading
export const SearchDiscoveryLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationSearchDiscovery isProcessing={true} />
      </div>
    </div>
  );
});
SearchDiscoveryLoading.displayName = 'SearchDiscoveryLoading';

// Web Access Loading
export const WebAccessLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationWebAccess isProcessing={true} />
      </div>
    </div>
  );
});
WebAccessLoading.displayName = 'WebAccessLoading';

// Code Analysis Loading
export const CodeAnalysisLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationCodeAnalysis isProcessing={true} />
      </div>
    </div>
  );
});
CodeAnalysisLoading.displayName = 'CodeAnalysisLoading';


// Agent Operations Loading
export const AgentOperationsLoading = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 flex items-center justify-center h-24">
      <div className="w-24 h-24">
        <AnimationAgentOperations isProcessing={true} />
      </div>
    </div>
  );
});
AgentOperationsLoading.displayName = 'AgentOperationsLoading';
