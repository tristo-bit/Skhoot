
/**
 * Universal Agent Chat Service
 * 
 * Handles AI chat with tool calling for the CLI Agent.
 * Refactored to separate concerns into dedicated modules.
 */

import { apiKeyService } from './apiKeyService';
import { providerRegistry } from './providerRegistry';
import { activityLogger } from './activityLogger';
import { AgentChatOptions, AgentChatResponse, AgentChatMessage, AgentToolCall, ToolResult } from './agent/types';
import { ToolRegistry } from './agent/ToolRegistry';
import { ToolExecutor } from './agent/ToolExecutor';
import { PromptBuilder } from './agent/PromptBuilder';

export type { AgentChatOptions };

class AgentChatService {
  private maxToolIterations = 10;
  private toolExecutor = new ToolExecutor();

  /**
   * Send a message to the agent and get a response with tool execution
   */
  async chat(
    message: string,
    history: AgentChatMessage[],
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
    console.log('[AgentChatService] chat() called - Using refactored architecture');
    console.log('[AgentChatService] Provider:', options.provider || 'auto-detect');
    console.log('[AgentChatService] Model:', options.model || 'default');
    console.log('[AgentChatService] Session ID:', options.sessionId);

    // Load settings
    const { hyperlinkSettingsService } = await import('./hyperlinkSettingsService');
    const { memorySettingsService } = await import('./memorySettingsService');
    const hyperlinkSettings = hyperlinkSettingsService.loadSettings();
    const memorySettings = memorySettingsService.loadSettings();

    const provider = options.provider || await this.getActiveProvider();

    if (!provider) {
      throw new Error('No AI provider configured. Please add an API key in settings.');
    }

    // Get provider config and model info
    const providerConfig = providerRegistry.getProvider(provider);
    
    let apiKey: string;
    try {
      apiKey = await apiKeyService.loadKey(provider);
    } catch (error) {
      console.error('[AgentChatService] Failed to load API key for provider:', provider, error);
      throw new Error(`No API key found for provider: ${provider}. Please add an API key in settings.`);
    }
    
    if (!apiKey) {
      throw new Error(`API key is empty for provider: ${provider}. Please add an API key in settings.`);
    }
    
    const savedModel = await apiKeyService.loadModel(provider);
    const model = options.model || savedModel || providerConfig?.defaultModel || 'default';
    const modelInfo = providerRegistry.getModelInfo(provider, model);
    
    console.log('[AgentChatService] Using provider:', provider, 'model:', model, 'format:', providerConfig?.apiFormat);

    // Set custom endpoint if provided
    if (options.customEndpoint) {
      providerRegistry.setCustomEndpoint(provider, options.customEndpoint);
    }

    // Check tool calling support
    if (!modelInfo?.capabilities.toolCalling) {
      options.onStatusUpdate?.(`⚠️ Model ${model} may not support tool calling`);
    }

    options.onStatusUpdate?.(`Connecting to ${providerConfig?.name || provider}...`);

    try {
      // Get API format and route accordingly
      const apiFormat = providerRegistry.getApiFormat(provider);
      const baseUrl = providerRegistry.getBaseUrl(provider);

      if (!baseUrl) {
        throw new Error(`No endpoint configured for provider: ${provider}`);
      }

      // Generate System Prompt
      const systemPrompt = PromptBuilder.getSystemPrompt(
        provider,
        model,
        options.workspaceRoot || '~', // Default to Home Directory for Agent Context

        modelInfo?.capabilities,
        options.systemPrompt,
        hyperlinkSettings,
        // We'll let the provider adapter handle memory injection if needed, 
        // or inject it here if we had access to the memory string directly.
        // For now, consistent with previous behavior, we don't fetch memory here.
      );

      // Get Tools
      const tools = ToolRegistry.getToolsForFormat(apiFormat, options.allowedTools);

      // Delegate to Provider Registry for actual API call
      return await providerRegistry.chat(
        provider,
        model,
        apiKey,
        message,
        history,
        systemPrompt,
        modelInfo?.capabilities?.toolCalling ? tools : undefined,
        options.images,
        options.abortSignal // ADDED
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      activityLogger.log('Agent', message.slice(0, 50), `Error: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Execute the tool calling loop - sends message, executes tools, continues until done
   */
  async executeWithTools(
    message: string,
    history: AgentChatMessage[],
    options: AgentChatOptions
  ): Promise<{ 
    content: string; 
    thought?: string;
    toolResults: ToolResult[]; 
    displayImages?: Array<{ url: string; alt?: string; fileName?: string }>;
    generatedFiles?: string[];
  }> {
    const allToolResults: ToolResult[] = [];
    const displayImages: Array<{ url: string; alt?: string; fileName?: string }> = [];
    // Start with initial history
    let currentHistory = [...history];
    let iterations = 0;

    // Check if this is a direct tool call (user selected from dropdown)
    if (options.directToolCall) {
      console.log('[AgentChatService] Executing direct tool call:', options.directToolCall);
      
      const toolCall: AgentToolCall = {
        id: `direct-${Date.now()}`,
        name: options.directToolCall.name,
        arguments: options.directToolCall.arguments,
      };
      
      options.onToolStart?.(toolCall);
      options.onStatusUpdate?.(`Executing ${toolCall.name}...`);
      
      const result = await this.toolExecutor.execute(toolCall, options);
      allToolResults.push(result);
      options.onToolComplete?.(result);
      
      this.collectImages(toolCall, displayImages);
      
      return {
        ...this.formatDirectExecutionResult(toolCall, result, allToolResults, displayImages),
        thought: undefined
      };
    }

    // currentMessage will hold the input for each turn. 
    // On first turn, it's the original prompt. On subsequent turns, it's empty (continuation).
    let currentMessage = message;

    while (iterations < this.maxToolIterations) {
      if (options.abortSignal?.aborted) {
        throw new Error('Chat execution aborted');
      }
      
      iterations++;
      options.onStatusUpdate?.(`Processing (iteration ${iterations})...`);

      // Get AI response
      // Pass the new message and existing history separately. 
      // providerRegistry.chat will combine them correctly.
      const response = await this.chat(currentMessage, currentHistory, options);

      // After first call, add the original user message to currentHistory 
      // so it becomes part of the permanent context for subsequent iterations.
      if (iterations === 1 && currentMessage) {
        currentHistory.push({ role: 'user', content: currentMessage });
      }

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // Solution 1: If content is empty after using tools, force a summary
        if (allToolResults.length > 0 && (!response.content || response.content.trim().length === 0)) {
          console.log('[AgentChatService] Empty response after tool execution, requesting summary...');
          options.onStatusUpdate?.('Generating summary...');
          
          const summaryPrompt = 'Please provide a natural language summary of the results from the tools you just used. Be specific and helpful.';
          const summaryResponse = await this.chat(summaryPrompt, currentHistory, options);
          
          return {
            content: summaryResponse.content || 'I have completed the requested tasks using the available tools.',
            thought: response.thought || summaryResponse.thought,
            toolResults: allToolResults,
            displayImages: displayImages.length > 0 ? displayImages : undefined
          };
        }
        
        return { 
          content: response.content, 
          thought: response.thought,
          toolResults: allToolResults,
          displayImages: displayImages.length > 0 ? displayImages : undefined
        };
      }

  // Add assistant message with tool calls to history

      currentHistory.push({
        role: 'assistant',
        content: response.content,
        thought: response.thought,
        thought_signature: response.thought_signature,
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      for (const toolCall of response.toolCalls) {
        options.onToolStart?.(toolCall);
        options.onStatusUpdate?.(`Executing ${toolCall.name}...`);

        const result = await this.toolExecutor.execute(toolCall, options);
        allToolResults.push(result);
        options.onToolComplete?.(result);
        
        this.collectImages(toolCall, displayImages);

        // Add tool result to history
        currentHistory.push({
          role: 'tool',
          content: result.output || result.error || 'No output',
          toolCallId: toolCall.id,
          toolCallName: toolCall.name,
          thought_signature: toolCall.thought_signature,
        });
      }

      // Continue the loop to get next response
      currentMessage = ''; // Empty message for continuation
    }

    return {
      content: 'Maximum tool iterations reached. Please try a simpler request.',
      toolResults: allToolResults,
      displayImages: displayImages.length > 0 ? displayImages : undefined
    };
  }

  private async getActiveProvider(): Promise<string> {
    const provider = await apiKeyService.getActiveProvider();
    return provider || 'openai'; // Default fallback
  }

  private collectImages(toolCall: AgentToolCall, displayImages: Array<{ url: string; alt?: string; fileName?: string }>) {
    // Collect images from web search results
    if (toolCall.name === 'web_search' && (toolCall as any)._webSearchImages) {
      const images = (toolCall as any)._webSearchImages;
      images.forEach((img: any) => {
        displayImages.push({
          url: img.thumbnail_url || img.url,
          alt: img.title,
          fileName: img.title
        });
      });
    }
  }

  private formatDirectExecutionResult(
    toolCall: AgentToolCall, 
    result: ToolResult, 
    allToolResults: ToolResult[], 
    displayImages: Array<{ url: string; alt?: string; fileName?: string }>
  ): { content: string; toolResults: ToolResult[]; displayImages?: Array<{ url: string; alt?: string; fileName?: string }> } {
    if (result.success) {
      return {
        content: `✅ Tool executed successfully:\n\n**${toolCall.name}**\n\n${result.output}`,
        toolResults: allToolResults,
        displayImages: displayImages.length > 0 ? displayImages : undefined
      };
    } else {
      return {
        content: `❌ Tool execution failed:\n\n**${toolCall.name}**\n\nError: ${result.error}`,
        toolResults: allToolResults,
        displayImages: displayImages.length > 0 ? displayImages : undefined
      };
    }
  }
}

export const agentChatService = new AgentChatService();
