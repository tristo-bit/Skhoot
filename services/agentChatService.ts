/**
 * Universal Agent Chat Service
 * 
 * Handles AI chat with tool calling for the CLI Agent.
 * Works with ANY provider - known (OpenAI, Google, Anthropic) or custom/local.
 * Auto-detects API format and adapts tool calling accordingly.
 */

import { apiKeyService } from './apiKeyService';
import { providerRegistry, APIFormat, ModelCapabilities } from './providerRegistry';
import { agentService, AgentToolCall, ToolResult } from './agentService';
import { activityLogger } from './activityLogger';

// ============================================================================
// Types
// ============================================================================

export type AIProvider = string; // Any provider ID

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  toolResults?: ToolResult[];
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;
}

export interface AgentChatResponse {
  content: string;
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
  /** Custom endpoint URL (for custom providers) */
  customEndpoint?: string;
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;
  onToolStart?: (toolCall: AgentToolCall) => void;
  onToolComplete?: (result: ToolResult) => void;
  onStatusUpdate?: (status: string) => void;
}

// ============================================================================
// Agent Tools - Universal Format
// ============================================================================

const AGENT_TOOLS = [
  {
    name: 'create_terminal',
    description: 'Create a new terminal session for executing commands. Returns a session ID that can be used to execute commands and read output. Use this when you need to run multiple commands in the same terminal context or maintain state across commands.',
    parameters: {
      type: 'object',
      properties: {
        workspaceRoot: { type: 'string', description: 'Optional workspace root directory for the terminal session. Commands will execute relative to this directory.' },
        type: { type: 'string', description: "Type of terminal to create: 'shell' (default) or 'codex'" },
      },
      required: [],
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a command in a specific terminal session. The command will be sent to the terminal and executed asynchronously. Use read_output to get the results.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to execute the command in (from create_terminal)' },
        command: { type: 'string', description: 'The command to execute (newline will be automatically appended)' },
      },
      required: ['sessionId', 'command'],
    },
  },
  {
    name: 'read_output',
    description: 'Read output from a terminal session. Returns all output since the last read, including stdout and stderr.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to read from' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'list_terminals',
    description: 'List all active terminal sessions with their current states. Useful for discovering available terminals.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'inspect_terminal',
    description: 'Get detailed state information about a specific terminal session, including command history and current output.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to inspect' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'shell',
    description: 'Execute a shell command and return its output. Use for running terminal commands, scripts, or system operations.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        workdir: { type: 'string', description: 'Working directory for command execution' },
        timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file. Can read entire file or specific line ranges.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        start_line: { type: 'number', description: 'Starting line number (1-indexed)' },
        end_line: { type: 'number', description: 'Ending line number (inclusive)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Can overwrite or append to existing files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
        mode: { type: 'string', description: "Write mode: 'overwrite' (default) or 'append'" },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory with file types and sizes.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the directory to list' },
        depth: { type: 'number', description: 'Maximum depth to traverse (default: 1)' },
        include_hidden: { type: 'boolean', description: 'Include hidden files (default: false)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by name pattern or content.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (glob for filenames, regex for content)' },
        path: { type: 'string', description: 'Directory to search in (default: current directory)' },
        search_type: { type: 'string', description: "Type of search: 'filename' or 'content'" },
        max_results: { type: 'number', description: 'Maximum results to return (default: 100)' },
      },
      required: ['pattern'],
    },
  },
];

// ============================================================================
// Tool Format Converters
// ============================================================================

function toOpenAITools() {
  return AGENT_TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function toAnthropicTools() {
  return AGENT_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

function toGeminiTools() {
  return [{
    function_declarations: AGENT_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, value]: [string, any]) => [
            key,
            { type: value.type.toUpperCase(), description: value.description }
          ])
        ),
        required: tool.parameters.required,
      },
    })),
  }];
}

function toOllamaTools() {
  // Ollama uses OpenAI-compatible format
  return toOpenAITools();
}

function getToolsForFormat(format: APIFormat) {
  switch (format) {
    case 'openai': return toOpenAITools();
    case 'anthropic': return toAnthropicTools();
    case 'google': return toGeminiTools();
    case 'ollama': return toOllamaTools();
    default: return toOpenAITools();
  }
}

// ============================================================================
// System Prompt
// ============================================================================

function getAgentSystemPrompt(provider: string, model: string, workingDirectory: string, capabilities?: ModelCapabilities): string {
  const capabilitiesInfo = capabilities 
    ? `\nModel capabilities: ${capabilities.toolCalling ? 'Tool calling ✓' : 'No tool calling'}, Context: ${capabilities.contextWindow} tokens`
    : '';

  // Check if model supports vision
  const visionModels = [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview',
    'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
    'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'
  ];
  
  const supportsVision = visionModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
  
  const visionCapabilities = supportsVision ? `

VISION CAPABILITIES:
- You CAN see and analyze images that users attach to their messages
- You have OCR capabilities to read text from images (screenshots, documents, signs, etc.)
- You can describe what's in images, identify objects, people, and scenes
- You can answer questions about image content
- When users attach images, analyze them and respond based on what you see
- NEVER say you cannot see images - you have full vision capabilities` : '';

  return `You are Skhoot Agent, an AI coding and system assistant running in the Skhoot application. You are expected to be precise, safe, and helpful.

IDENTITY:
- You are Skhoot Agent, powered by ${provider} (${model})${capabilitiesInfo}
- You are a general-purpose assistant that can help with ANY task on the user's computer
- When asked "who are you?" or "what can you do?", briefly introduce yourself AND demonstrate by using a tool

CAPABILITIES:
- Execute ANY shell command using the 'shell' tool (bash, system commands, package managers, etc.)
- Read file contents using 'read_file' (any file on the system)
- Write/modify files using 'write_file' (create, edit, or append to files)
- List directory contents using 'list_directory' (explore the filesystem)
- Search for files using 'search_files' (find files by name or content)${visionCapabilities}

WORKING DIRECTORY: ${workingDirectory}

CRITICAL BEHAVIOR - ALWAYS USE TOOLS:
- You MUST use tools to answer questions - NEVER say "I cannot" or "I don't have access"
- For ANY question about the computer/system, USE the shell tool to get real information
- Examples of what to do:
  * "Tell me about my computer" → Run: uname -a, cat /etc/os-release, free -h, df -h, lscpu
  * "What's my disk space?" → Run: df -h
  * "What processes are running?" → Run: ps aux or top -bn1
  * "What's my IP address?" → Run: ip addr or hostname -I
  * "What files are here?" → Use list_directory or shell with ls -la
- NEVER respond with just text saying you can't do something - TRY using tools first!

HOW YOU WORK:

1. Task Execution
   - Keep going until the query is completely resolved before ending your turn
   - Autonomously resolve the query to the best of your ability using the tools available
   - Do NOT guess or make up an answer - use tools to verify information
   - Break down complex tasks into steps and execute them systematically
   - When in doubt, USE A TOOL to find out

2. Shell Commands
   - You can run ANY shell command: system utilities, package managers, build tools, etc.
   - Use 'rg' (ripgrep) for fast text search when available, fall back to 'grep' if not
   - Use 'find' or 'fd' for file discovery
   - Run system analysis commands like 'df', 'du', 'free', 'top', 'ps', etc.
   - Install packages, run builds, execute scripts - whatever the task requires
   - IMPORTANT: When using terminal tools (create_terminal, execute_command), be BRIEF
   - The terminal output is automatically visible to the user - don't repeat it
   - Just execute commands and let the terminal show the results
   - Only mention terminal operations if there's an error or special context needed

3. File Operations
   - Read any file to understand its contents
   - Write or modify files as needed
   - Create new files and directories
   - Search through codebases and system files

4. Communication Style
   - Be concise and direct - no unnecessary verbosity
   - Provide progress updates for longer tasks
   - Show relevant output from tool executions
   - If a command fails, explain the error and suggest alternatives

5. Safety
   - Be careful with destructive operations (delete, format, etc.)
   - For potentially dangerous commands, explain what will happen first
   - Prefer reversible operations when possible

EXAMPLES OF WHAT YOU CAN DO:
- Get system information (CPU, RAM, disk, OS, network)
- Analyze disk usage and find large files to clean up
- Search for files by name, type, or content
- Read and modify configuration files
- Run system diagnostics and report status
- Execute build commands and run tests
- Install and manage packages
- Git operations and code management
- Process automation and scripting
- ANY other task that can be done via terminal

Remember: You have full access to the user's system through the shell tool. ALWAYS use tools to answer questions - never say you can't do something without trying first!`;
}

// ============================================================================
// Agent Chat Service Class
// ============================================================================

class AgentChatService {
  private maxToolIterations = 10;

  /**
   * Send a message to the agent and get a response with tool execution
   */
  async chat(
    message: string,
    history: AgentChatMessage[],
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
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

      return await this.chatWithFormat(
        apiFormat,
        baseUrl,
        apiKey,
        message,
        history,
        model,
        provider,
        modelInfo?.capabilities,
        options
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
  ): Promise<{ content: string; toolResults: ToolResult[] }> {
    const allToolResults: ToolResult[] = [];
    let currentHistory = [...history];
    let iterations = 0;

    // Add user message
    currentHistory.push({ role: 'user', content: message });

    while (iterations < this.maxToolIterations) {
      iterations++;
      options.onStatusUpdate?.(`Processing (iteration ${iterations})...`);

      // Get AI response
      const response = await this.chat(message, currentHistory, options);

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { content: response.content, toolResults: allToolResults };
      }

      // Add assistant message with tool calls to history
      currentHistory.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      for (const toolCall of response.toolCalls) {
        options.onToolStart?.(toolCall);
        options.onStatusUpdate?.(`Executing ${toolCall.name}...`);

        try {
          const result = await agentService.executeTool(options.sessionId, {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            arguments: toolCall.arguments,
          });

          allToolResults.push(result);
          options.onToolComplete?.(result);

          // Add tool result to history
          currentHistory.push({
            role: 'tool',
            content: result.output,
            toolCallId: toolCall.id,
          });
        } catch (error) {
          const errorResult: ToolResult = {
            toolCallId: toolCall.id,
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
          allToolResults.push(errorResult);
          options.onToolComplete?.(errorResult);

          currentHistory.push({
            role: 'tool',
            content: `Error: ${errorResult.error}`,
            toolCallId: toolCall.id,
          });
        }
      }

      // Continue the loop to get next response
      message = ''; // Empty message for continuation
    }

    return {
      content: 'Maximum tool iterations reached. Please try a simpler request.',
      toolResults: allToolResults,
    };
  }

  // ==========================================================================
  // Universal Chat Handler
  // ==========================================================================

  private async chatWithFormat(
    format: APIFormat,
    baseUrl: string,
    apiKey: string,
    message: string,
    history: AgentChatMessage[],
    model: string,
    provider: string,
    capabilities: ModelCapabilities | undefined,
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
    switch (format) {
      case 'openai':
      case 'ollama':
        return this.chatOpenAIFormat(baseUrl, apiKey, message, history, model, provider, capabilities, options);
      case 'anthropic':
        return this.chatAnthropicFormat(baseUrl, apiKey, message, history, model, provider, capabilities, options);
      case 'google':
        return this.chatGoogleFormat(baseUrl, apiKey, message, history, model, provider, capabilities, options);
      default:
        // Default to OpenAI format (most compatible)
        return this.chatOpenAIFormat(baseUrl, apiKey, message, history, model, provider, capabilities, options);
    }
  }

  // ==========================================================================
  // OpenAI-Compatible Format (OpenAI, Ollama, LM Studio, vLLM, etc.)
  // ==========================================================================

  private async chatOpenAIFormat(
    baseUrl: string,
    apiKey: string,
    message: string,
    history: AgentChatMessage[],
    model: string,
    provider: string,
    capabilities: ModelCapabilities | undefined,
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
    const workingDirectory = (await agentService.getConfig(options.sessionId))?.workingDirectory || '.';
    const providerConfig = providerRegistry.getProvider(provider);
    
    const messages = [
      { role: 'system', content: getAgentSystemPrompt(provider, model, workingDirectory, capabilities) },
      ...this.convertHistoryToOpenAI(history),
    ];

    // Add current message with images if provided
    if (options.images && options.images.length > 0) {
      console.log('[AgentChatService] Adding images to message:', options.images.length, 'images');
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...options.images.map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
              detail: 'high'
            }
          }))
        ]
      });
      options.onStatusUpdate?.(`Analyzing ${options.images.length} image(s) with ${provider}...`);
    } else if (message) {
      messages.push({ role: 'user', content: message });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...providerRegistry.getAuthHeaders(provider, apiKey),
    };

    // Build request body
    const body: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    // Only add tools if model supports tool calling
    if (capabilities?.toolCalling !== false) {
      body.tools = toOpenAITools();
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;

    // Parse tool calls
    const toolCalls = assistantMessage?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: typeof tc.function.arguments === 'string' 
        ? JSON.parse(tc.function.arguments) 
        : tc.function.arguments,
    })) as AgentToolCall[] | undefined;

    return {
      content: assistantMessage?.content || '',
      toolCalls,
      isComplete: !toolCalls || toolCalls.length === 0,
      provider,
      model,
      capabilities,
    };
  }

  // ==========================================================================
  // Anthropic Format
  // ==========================================================================

  private async chatAnthropicFormat(
    baseUrl: string,
    apiKey: string,
    message: string,
    history: AgentChatMessage[],
    model: string,
    provider: string,
    capabilities: ModelCapabilities | undefined,
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
    const workingDirectory = (await agentService.getConfig(options.sessionId))?.workingDirectory || '.';
    
    const messages = this.convertHistoryToAnthropic(history);
    
    // Add current message with images if provided
    if (options.images && options.images.length > 0) {
      console.log('[AgentChatService] Adding images to message:', options.images.length, 'images');
      const content: any[] = [{ type: 'text', text: message }];
      options.images.forEach(img => {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType,
            data: img.base64
          }
        });
      });
      messages.push({ role: 'user', content });
      options.onStatusUpdate?.(`Analyzing ${options.images.length} image(s) with ${provider}...`);
    } else if (message) {
      messages.push({ role: 'user', content: message });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...providerRegistry.getAuthHeaders(provider, apiKey),
    };

    const body: any = {
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: getAgentSystemPrompt(provider, model, workingDirectory, capabilities),
      messages,
    };

    // Only add tools if model supports tool calling
    if (capabilities?.toolCalling !== false) {
      body.tools = toAnthropicTools();
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse tool use
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    let toolCalls: AgentToolCall[] | undefined;

    if (toolUse) {
      toolCalls = [{
        id: toolUse.id,
        name: toolUse.name,
        arguments: toolUse.input,
      }];
    }

    const textContent = data.content?.find((c: any) => c.type === 'text')?.text || '';

    return {
      content: textContent,
      toolCalls,
      isComplete: !toolCalls || toolCalls.length === 0,
      provider,
      model,
      capabilities,
    };
  }

  // ==========================================================================
  // Google/Gemini Format
  // ==========================================================================

  private async chatGoogleFormat(
    baseUrl: string,
    apiKey: string,
    message: string,
    history: AgentChatMessage[],
    model: string,
    provider: string,
    capabilities: ModelCapabilities | undefined,
    options: AgentChatOptions
  ): Promise<AgentChatResponse> {
    const workingDirectory = (await agentService.getConfig(options.sessionId))?.workingDirectory || '.';
    
    const contents = this.convertHistoryToGemini(history);
    
    // Add current message with images if provided
    const currentParts: any[] = [{ text: message }];
    if (options.images && options.images.length > 0) {
      console.log('[AgentChatService] Adding images to message:', options.images.length, 'images');
      options.images.forEach(img => {
        currentParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64
          }
        });
      });
      options.onStatusUpdate?.(`Analyzing ${options.images.length} image(s) with ${provider}...`);
    }
    contents.push({ role: 'user', parts: currentParts });

    const body: any = {
      contents,
      systemInstruction: { parts: [{ text: getAgentSystemPrompt(provider, model, workingDirectory, capabilities) }] },
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    // Only add tools if model supports tool calling
    if (capabilities?.toolCalling !== false) {
      body.tools = toGeminiTools();
    }

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content;

    // Parse function calls
    const functionCall = content?.parts?.find((p: any) => p.functionCall);
    let toolCalls: AgentToolCall[] | undefined;

    if (functionCall) {
      toolCalls = [{
        id: `call_${Date.now()}`,
        name: functionCall.functionCall.name,
        arguments: functionCall.functionCall.args,
      }];
    }

    const textContent = content?.parts?.find((p: any) => p.text)?.text || '';

    return {
      content: textContent,
      toolCalls,
      isComplete: !toolCalls || toolCalls.length === 0,
      provider,
      model,
      capabilities,
    };
  }

  // ==========================================================================
  // History Conversion Helpers
  // ==========================================================================

  private convertHistoryToOpenAI(history: AgentChatMessage[]): any[] {
    const messages: any[] = [];

    for (const msg of history) {
      if (msg.role === 'user') {
        if (msg.images && msg.images.length > 0) {
          // User message with images
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content },
              ...msg.images.map(img => ({
                type: 'image_url',
                image_url: {
                  url: `data:${img.mimeType};base64,${img.base64}`,
                  detail: 'high'
                }
              }))
            ]
          });
        } else {
          messages.push({ role: 'user', content: msg.content });
        }
      } else if (msg.role === 'assistant') {
        const assistantMsg: any = { role: 'assistant', content: msg.content };
        if (msg.toolCalls) {
          assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          }));
        }
        messages.push(assistantMsg);
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  private convertHistoryToGemini(history: AgentChatMessage[]): any[] {
    const contents: any[] = [];

    for (const msg of history) {
      if (msg.role === 'user') {
        const parts: any[] = [{ text: msg.content }];
        if (msg.images && msg.images.length > 0) {
          // Add images as inline data
          msg.images.forEach(img => {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64
              }
            });
          });
        }
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: 'tool', response: { result: msg.content } } }],
        });
      }
    }

    return contents;
  }

  private convertHistoryToAnthropic(history: AgentChatMessage[]): any[] {
    const messages: any[] = [];

    for (const msg of history) {
      if (msg.role === 'user') {
        if (msg.images && msg.images.length > 0) {
          // User message with images
          const content: any[] = [{ type: 'text', text: msg.content }];
          msg.images.forEach(img => {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.base64
              }
            });
          });
          messages.push({ role: 'user', content });
        } else {
          messages.push({ role: 'user', content: msg.content });
        }
      } else if (msg.role === 'assistant') {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
          }
        }
        messages.push({ role: 'assistant', content });
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }],
        });
      }
    }

    return messages;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private async getActiveProvider(): Promise<string | null> {
    try {
      const provider = await apiKeyService.getActiveProvider();
      console.log('[AgentChatService] getActiveProvider result:', provider);
      
      if (!provider) {
        // Try to find any configured provider as fallback
        const providers = await apiKeyService.listProviders();
        console.log('[AgentChatService] Available providers:', providers);
        
        if (providers.length > 0) {
          // Use the first available provider
          const fallbackProvider = providers[0];
          console.log('[AgentChatService] Using fallback provider:', fallbackProvider);
          return fallbackProvider;
        }
      }
      
      return provider;
    } catch (error) {
      console.error('[AgentChatService] Error getting active provider:', error);
      
      // Try fallback to list providers
      try {
        const providers = await apiKeyService.listProviders();
        if (providers.length > 0) {
          console.log('[AgentChatService] Fallback to first provider:', providers[0]);
          return providers[0];
        }
      } catch (listError) {
        console.error('[AgentChatService] Error listing providers:', listError);
      }
      
      return null;
    }
  }

  /**
   * Check if a model supports tool calling
   */
  supportsToolCalling(provider: string, model: string): boolean {
    return providerRegistry.supportsToolCalling(provider, model);
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(provider: string, model: string): ModelCapabilities | undefined {
    return providerRegistry.getModelInfo(provider, model)?.capabilities;
  }
}

// Export singleton
export const agentChatService = new AgentChatService();
