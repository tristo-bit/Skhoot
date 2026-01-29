
import { ModelCapabilities } from '../providerRegistry';

// ============================================================================
// Core Agent Types
// ============================================================================

export type AIProvider = string;

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: any;
  /** Gemini-specific thought signature for function calls */
  thought_signature?: string;
  _hidden?: boolean; // Internal flag for UI hidden tools
}

export interface ToolResult {
  toolCallId: string;
  toolCallName?: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  /** Gemini-specific thought process */
  thought?: string;
  /** Gemini-specific thought signature for tool responses */
  thought_signature?: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  toolCallName?: string; // Needed for some providers (e.g. Gemini)
  toolResults?: ToolResult[];
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;
}

export interface AgentChatResponse {
  content: string;
  /** Gemini-specific thought process */
  thought?: string;
  /** Gemini-specific thought signature */
  thought_signature?: string;
  toolCalls?: AgentToolCall[];
  isComplete: boolean;
  provider: string;
  model: string;
  capabilities?: ModelCapabilities;
}

export interface AgentChatOptions {
  sessionId: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  customEndpoint?: string;
  workspaceRoot?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  directToolCall?: { name: string; arguments: Record<string, any> };
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;
  onToolStart?: (toolCall: AgentToolCall) => void;
  onToolComplete?: (result: ToolResult) => void;
  onStatusUpdate?: (status: string) => void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}
