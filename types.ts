
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'file_list' | 'message_list' | 'analysis' | 'disk_usage' | 'cleanup' | 'agent_action' | 'workflow';
  data?: any;
  searchInfo?: any; // Enhanced search information from backend
  timestamp: Date;
  // Agent-specific fields
  toolCalls?: AgentToolCallData[];
  toolResults?: AgentToolResultData[];
  // Attached files for context
  attachedFiles?: { fileName: string; filePath: string }[];
  // Images for vision API (user-attached images as base64)
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;
  // Display images (for showing in chat - can be URLs or base64)
  displayImages?: Array<{ url: string; alt?: string; fileName?: string }>;
  // Workflow execution data
  workflowExecution?: {
    executionId: string;
    workflowId: string;
    workflowName: string;
  };
}

// Agent tool call data for messages
export interface AgentToolCallData {
  id: string;
  name: 'shell' | 'read_file' | 'write_file' | 'list_directory' | 'search_files' | 'create_terminal' | 'execute_command' | 'read_output' | 'list_terminals' | 'inspect_terminal';
  arguments: Record<string, any>;
}

// Agent tool result data for messages
export interface AgentToolResultData {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: string;
  category: string;
  safeToRemove: boolean;
  lastUsed: string;
}

export interface DiskInfo {
  id: string;
  name: string;
  totalSpace: number; // in GB
  usedSpace: number; // in GB
  availableSpace: number; // in GB
  usagePercentage: number;
  type: 'internal' | 'external' | 'network';
}

export interface CleanupItem {
  id: string;
  name: string;
  path: string;
  size: string;
  type: 'folder' | 'file';
  canRemove: boolean;
  description: string;
  consequence: string;
  lastAccessed: string;
}

export interface ConversationMessage {
  id: string;
  app: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface SearchResult {
  files?: FileInfo[];
  messages?: ConversationMessage[];
  analysis?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  provider: 'email' | 'google' | 'microsoft' | 'apple';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
