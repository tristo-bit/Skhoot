/**
 * Agent Action Component - Refactored with Plugin System
 * 
 * Displays agent tool calls in the conversation UI using the plugin system.
 * Each tool type has its own UI component registered in the ToolCallRegistry.
 * 
 * This component now acts as a router that:
 * 1. Looks up the appropriate plugin for the tool
 * 2. Wraps it in a ToolCallContainer for consistent UI
 * 3. Falls back to GenericToolCallUI for unknown tools
 */

import React, { memo, useMemo } from 'react';
import { 
  toolCallRegistry,
  ToolCallContainer,
  GenericToolCallUI,
  ToolIcon,
} from '../tool-calls';

// ============================================================================
// Types
// ============================================================================

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AgentToolResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface AgentActionProps {
  toolCall: AgentToolCall;
  result?: AgentToolResult;
  isExecuting?: boolean;
  onCancel?: () => void;
  onNavigateDirectory?: (path: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getResultSummary(toolName: string, result?: AgentToolResult, parsedData?: any): string | null {
  if (!result?.success) return null;
  
  // For file operations with parsed data
  if (parsedData && Array.isArray(parsedData)) {
    return `${parsedData.length} item${parsedData.length !== 1 ? 's' : ''} found`;
  }
  
  // For read_file
  if (toolName === 'read_file' && result.output) {
    const lines = result.output.split('\n').length;
    return `${lines} line${lines !== 1 ? 's' : ''}`;
  }
  
  // For shell commands
  if ((toolName === 'shell' || toolName === 'execute_command') && result.output) {
    const lines = result.output.split('\n').filter(l => l.trim()).length;
    return lines > 0 ? `${lines} line${lines !== 1 ? 's' : ''}` : 'Done';
  }
  
  return null;
}

// ============================================================================
// Agent Action Component
// ============================================================================

export const AgentAction = memo<AgentActionProps>(({ 
  toolCall, 
  result, 
  isExecuting = false,
  onCancel,
  onNavigateDirectory,
}) => {
  // Get plugin for this tool
  const plugin = toolCallRegistry.get(toolCall.name);
  
  // Determine status
  const status = isExecuting ? 'executing' : result?.success ? 'success' : result ? 'error' : 'executing';
  
  // Get summary for the header
  const summary = useMemo(() => {
    if (!result) return null;
    return getResultSummary(toolCall.name, result);
  }, [toolCall.name, result]);

  // If plugin exists, use it
  if (plugin) {
    const ToolUI = plugin.component;
    
    // Use custom wrapper if provided
    if (plugin.customWrapper) {
      const CustomWrapper = plugin.customWrapper;
      return (
        <CustomWrapper
          toolCall={toolCall}
          result={result}
          isExecuting={isExecuting}
          onCancel={onCancel}
          plugin={plugin}
        >
          <ToolUI
            toolCall={toolCall}
            result={result}
            isExecuting={isExecuting}
            onCancel={onCancel}
            onNavigate={onNavigateDirectory}
          />
        </CustomWrapper>
      );
    }
    
    // Use default wrapper with plugin customizations
    const animationClass = plugin.animations?.enter || 'animate-in fade-in slide-in-from-bottom-1 duration-300';
    const cardClass = plugin.styling?.cardClassName || '';
    
    return (
      <div className={`my-3 ${animationClass} ${cardClass}`}>
        <ToolCallContainer
          toolName={toolCall.name}
          displayName={plugin.displayName}
          icon={plugin.icon}
          status={status}
          durationMs={result?.durationMs}
          arguments={toolCall.arguments}
          summary={summary || undefined}
          onCancel={isExecuting ? onCancel : undefined}
          headerClassName={plugin.styling?.headerClassName}
          contentClassName={plugin.styling?.contentClassName}
        >
          {isExecuting && plugin.loadingComponent ? (
            <plugin.loadingComponent toolCall={toolCall} onCancel={onCancel} />
          ) : (
            <ToolUI
              toolCall={toolCall}
              result={result}
              isExecuting={isExecuting}
              onCancel={onCancel}
              onNavigate={onNavigateDirectory}
            />
          )}
        </ToolCallContainer>
      </div>
    );
  }
  
  // Fallback to generic UI for unknown tools
  return (
    <div className="my-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <ToolCallContainer
        toolName={toolCall.name}
        displayName={toolCall.name}
        icon={ToolIcon}
        status={status}
        durationMs={result?.durationMs}
        arguments={toolCall.arguments}
        summary={summary || undefined}
        onCancel={isExecuting ? onCancel : undefined}
      >
        <GenericToolCallUI
          toolCall={toolCall}
          result={result}
          isExecuting={isExecuting}
          onCancel={onCancel}
        />
      </ToolCallContainer>
    </div>
  );
});

AgentAction.displayName = 'AgentAction';

