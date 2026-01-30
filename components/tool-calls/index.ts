/**
 * Tool Call Plugin System - Public API
 * 
 * Export all public components and utilities.
 */

// Registry
export { toolCallRegistry } from './registry/ToolCallRegistry';
export type { 
  ToolCallPlugin, 
  ToolCallUIProps, 
  ToolCall, 
  ToolCallResult,
  ToolCategory,
  ToolLayout,
  IToolCallRegistry,
  ToolCallLoadingProps,
  ToolCallWrapperProps,
} from './registry/types';

// Shared Components
export { StatusBadge } from './shared/StatusBadge';
export { ToolIcon } from './shared/ToolIcon';
export { ToolCallContainer } from './shared/ToolCallContainer';
export { GenericToolCallUI } from './shared/GenericToolCallUI';

// File Operations
export { ListDirectoryUI } from './file-operations/ListDirectoryUI';
export { ListDirectoryLoadingUI } from './file-operations/ListDirectoryLoadingUI';
export { SearchFilesUI } from './file-operations/SearchFilesUI';
export { ReadFileUI } from './file-operations/ReadFileUI';
export { WriteFileUI } from './file-operations/WriteFileUI';

// Shell Operations
export { ShellCommandUI } from './shell-operations/ShellCommandUI';
export { TerminalUI } from './shell-operations/TerminalUI';

// Web Operations
export { WebSearchUI } from './web-operations/WebSearchUI';
export { WebSearchLoadingUI } from './web-operations/WebSearchLoadingUI';
export { WebSearchCustomWrapper } from './web-operations/WebSearchCustomWrapper';

// Agent Operations
export { InvokeAgentUI } from './agent-operations/InvokeAgentUI';
export { ListAgentsUI } from './agent-operations/ListAgentsUI';
export { CreateAgentUI } from './agent-operations/CreateAgentUI';

// Bookmark Operations
export { MessageSearchUI } from './bookmark-operations/MessageSearchUI';

// Memory Operations
export { MemorySearchUI } from './memory-operations/MemorySearchUI';

// Framer Motion Animations
export { AnimationFileOperations } from './AnimationFileOperations';
export { AnimationCommandExecution } from './AnimationCommandExecution';
export { AnimationSearchDiscovery } from './AnimationSearchDiscovery';
export { AnimationWebAccess } from './AnimationWebAccess';
export { AnimationCodeAnalysis } from './AnimationCodeAnalysis';
export { AnimationAgentOperations } from './AnimationAgentOperations';

// Loading Animations
export { 
  FileOperationsLoading,
  CommandExecutionLoading,
  SearchDiscoveryLoading,
  WebAccessLoading,
  CodeAnalysisLoading,
  AgentOperationsLoading
} from './shared/LoadingAnimations';
