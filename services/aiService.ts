
/**
 * Unified AI Service
 * Routes chat requests to the active provider (OpenAI, Google, Anthropic, Custom)
 * Now significantly simplified by delegating to providerRegistry and FileSearchService.
 */

import { apiKeyService } from './apiKeyService';
import { tokenTrackingService } from './tokenTrackingService';
import { providerRegistry } from './providerRegistry';
import { fileSearchService } from './search/FileSearchService';
import { AgentChatMessage } from './agent/types';

import { SearchResponse } from './search/FileSearchService';

// Provider types
export type AIProvider = 'openai' | 'google' | 'anthropic' | 'custom';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: Array<{
    fileName: string;
    base64: string;
    mimeType: string;
  }>;
}

export interface AIResponse {
  text: string;
  type: 'text' | 'file_list' | 'analysis' | 'error';
  data?: any;
  provider: AIProvider;
  model?: string;
  searchInfo?: {
    query?: string;
    totalResults?: number;
    executionTime?: number;
    mode?: string;
    [key: string]: any;
  };
}

export interface AIServiceConfig {
  customEndpoint?: string;
  customModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

// Tool definitions for legacy chat mode
const TOOLS_OPENAI = [
  {
    type: 'function',
    function: {
      name: 'findFile',
      description: 'Find a file on the user computer using natural language keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'File name, partial name, or content keywords to search for.' },
          file_types: { type: 'string', description: 'Optional comma-separated file extensions like "rs,js,py".' },
          search_path: { type: 'string', description: 'Optional folder path to search in.' }
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchContent',
      description: 'Search inside file contents for specific text, code, or patterns.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or code pattern to search for inside files.' },
          file_types: { type: 'string', description: 'Optional comma-separated file extensions.' },
          search_path: { type: 'string', description: 'Optional folder path to search in.' }
        },
        required: ['query'],
      },
    },
  },
];

const TOOLS_ANTHROPIC = [
  {
    name: 'findFile',
    description: 'Find a file on the user computer using natural language keywords.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'File name or keywords to search for.' },
        file_types: { type: 'string', description: 'Optional comma-separated file extensions.' },
        search_path: { type: 'string', description: 'Optional folder path to search in.' }
      },
      required: ['query'],
    },
  },
  {
    name: 'searchContent',
    description: 'Search inside file contents for specific text, code, or patterns.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text or code pattern to search for.' },
        file_types: { type: 'string', description: 'Optional comma-separated file extensions.' },
        search_path: { type: 'string', description: 'Optional folder path to search in.' }
      },
      required: ['query'],
    },
  },
];

class AIService {
  private config: AIServiceConfig = {};

  setConfig(config: AIServiceConfig): void {
    this.config = { ...this.config, ...config };
  }

  async getActiveProvider(): Promise<AIProvider | null> {
    try {
      const provider = await apiKeyService.getActiveProvider();
      return provider as AIProvider | null;
    } catch (error) {
      console.error('[AIService] Failed to get active provider:', error);
      return null;
    }
  }

  async hasApiKey(provider: AIProvider): Promise<boolean> {
    return apiKeyService.hasKey(provider);
  }

  /**
   * Get the system prompt for Skhoot with file search capabilities
   */
  private getSystemPrompt(provider: AIProvider, model: string): string {
    const visionModels = [
      'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview', 
      'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
      'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'
    ];
    
    const supportsVision = visionModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
    
    const visionCapabilities = supportsVision ? `
VISION CAPABILITIES:
- You CAN see and analyze images that users attach to their messages
- You have OCR capabilities to read text from images
- You can describe what's in images, identify objects, people, and scenes
- NEVER say you cannot see images - you have full vision capabilities` : '';
    
    return `You are Skhoot, a helpful desktop assistant.

CRITICAL IDENTITY RULES (NEVER IGNORE):
- Your name is "Skhoot"
- You are powered by ${provider} using the ${model} model
- ALWAYS identify as Skhoot first

YOUR CAPABILITIES:
- Finding files on the user's computer using the findFile function
- Searching inside file contents using the searchContent function
- Answering questions and providing helpful information${visionCapabilities}

FILE SEARCH RULES:
1. When users ask to find, locate, or search for FILES by name, use the findFile function
2. When users ask what files CONTAIN or SAY about something, use searchContent
3. When users mention specific folders, pass that as the search_path parameter

SEMANTIC SEARCH STRATEGY:
Expand conceptual searches intelligently (e.g. "resume" -> "resume,cv,curriculum" with "pdf,doc").

Be concise, friendly, and helpful.`;
  }

  /**
   * Main chat function - routes to the active provider with file search capabilities
   */
  async chat(
    message: string,
    history: AIMessage[] = [],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>,
    chatId?: string,
    messageId?: string,
    config?: AIServiceConfig
  ): Promise<AIResponse> {
    const provider = await this.getActiveProvider();
    
    if (!provider) {
      return {
        text: '⚠️ No AI provider configured. Please add an API key in User Profile → API Configuration.',
        type: 'error',
        provider: 'openai',
      };
    }

    onStatusUpdate?.(`Using ${provider}...`);

    try {
      const apiKey = await apiKeyService.loadKey(provider);
      const savedModel = await apiKeyService.loadModel(provider);
      const providerConfig = providerRegistry.getProvider(provider);
      const model = savedModel || this.config.customModel || providerConfig?.defaultModel || 'default';

      // Set custom endpoint if needed
      if (this.config.customEndpoint && provider === 'custom') {
        providerRegistry.setCustomEndpoint(provider, this.config.customEndpoint);
      }

      const systemPrompt = this.getSystemPrompt(provider, model);

      // Convert history to AgentChatMessage format
      const agentHistory: AgentChatMessage[] = history.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        // Map images if they exist in history
        images: m.images
      }));

      // Determine tools to use based on provider format
      const apiFormat = providerRegistry.getApiFormat(provider);
      let tools: any;
      if (apiFormat === 'openai' || apiFormat === 'ollama') {
        tools = TOOLS_OPENAI;
      } else if (apiFormat === 'anthropic') {
        tools = TOOLS_ANTHROPIC;
      } else if (apiFormat === 'google') {
        // Gemini specific tool format
        tools = [{
          functionDeclarations: [
            {
              name: 'findFile',
              description: 'Find a file on the user computer using natural language keywords.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: { type: 'STRING', description: 'File name or keywords.' },
                  file_types: { type: 'STRING', description: 'Optional comma-separated extensions.' },
                  search_path: { type: 'STRING', description: 'Optional folder path.' }
                },
                required: ['query'],
              },
            },
            {
              name: 'searchContent',
              description: 'Search inside file contents for specific text or patterns.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: { type: 'STRING', description: 'Text to search for.' },
                  file_types: { type: 'STRING', description: 'Optional extensions.' },
                  search_path: { type: 'STRING', description: 'Optional folder path.' }
                },
                required: ['query'],
              },
            },
          ]
        }];
      }

      // Execute chat request via ProviderRegistry
      const response = await providerRegistry.chat(
        provider,
        model,
        apiKey,
        message,
        agentHistory,
        systemPrompt,
        tools,
        images
      );

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolCall = response.toolCalls[0]; // Handle first tool call for simple chat
        let toolResult: SearchResponse | undefined;

        if (toolCall.name === 'findFile') {
          toolResult = await fileSearchService.findFile(
            toolCall.arguments, 
            onStatusUpdate,
            { provider, apiKey, model, userMessage: message },
            { chatId, messageId }
          );
        } else if (toolCall.name === 'searchContent') {
          toolResult = await fileSearchService.searchContent(
            toolCall.arguments,
            onStatusUpdate,
            { chatId, messageId }
          );
        }

        if (toolResult && toolResult.type === 'file_list' && toolResult.data) {
          // Send tool output back to AI for summarization
          // We need to format the tool response message based on provider
          // But for now, we'll just ask the AI to summarize using a new request context to keep it simple
          // leveraging the existing connection logic in providerRegistry
          
          const summaryPrompt = `I found ${toolResult.data.length} files. Please summarize these results for the user.`;
          
          // Add tool result to history conceptually
          const summaryHistory = [...agentHistory];
          summaryHistory.push({ role: 'assistant', content: '', toolCalls: [toolCall] });
          summaryHistory.push({ role: 'tool', toolCallId: toolCall.id, content: JSON.stringify(toolResult), toolCallName: toolCall.name });

          const summaryResponse = await providerRegistry.chat(
            provider,
            model,
            apiKey,
            summaryPrompt,
            summaryHistory,
            systemPrompt
          );

          return {
            text: summaryResponse.content,
            type: 'file_list',
            data: toolResult.data,
            provider: provider as AIProvider,
            model,
            searchInfo: toolResult.searchInfo,
          };
        }
      }

      // Track token usage
      // Note: providerRegistry chat method doesn't return usage directly yet, 
      // we might need to enhance AgentChatResponse or rely on internal logging in providerRegistry
      // For now, we estimate based on text length if needed
      tokenTrackingService.setCurrentModel(provider, model);
      tokenTrackingService.recordUsage(0, 0, model, provider, message, response.content);

      return {
        text: response.content,
        type: 'text',
        provider: provider as AIProvider,
        model,
      };

    } catch (error) {
      console.error(`[AIService] Chat failed with ${provider}:`, error);
      return {
        text: `❌ Error with ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        provider,
      };
    }
  }

  getModelsForProvider(provider: AIProvider): string[] {
    const config = providerRegistry.getProvider(provider);
    return config?.models.map(m => m.id) || [];
  }

  getDefaultModel(provider: AIProvider): string {
    const config = providerRegistry.getProvider(provider);
    return config?.defaultModel || '';
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
