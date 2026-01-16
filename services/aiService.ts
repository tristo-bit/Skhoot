/**
 * Unified AI Service with File Search Capabilities
 * Routes chat requests to the active provider (OpenAI, Google, Anthropic, Custom)
 * Includes file search, content search, and other desktop assistant features
 * Loads API keys from secure storage via apiKeyService
 */

import { apiKeyService } from './apiKeyService';
import { backendApi } from './backendApi';
import { activityLogger } from './activityLogger';

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
}

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  custom: {
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
};

// Tool definitions for function calling (OpenAI format)
const TOOLS_OPENAI = [
  {
    type: 'function',
    function: {
      name: 'findFile',
      description: 'Find a file on the user computer using natural language keywords. Use this when the user asks to find, locate, search for files, or asks "where is" something.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'File name, partial name, or content keywords to search for.' },
          file_types: { type: 'string', description: 'Optional comma-separated file extensions like "rs,js,py" to filter by file type.' },
          search_path: { type: 'string', description: 'Optional folder path to search in, e.g. "Downloads", "Documents", "Desktop".' }
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchContent',
      description: 'Search inside file contents for specific text, code, or patterns. Use when user wants to find files containing specific content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or code pattern to search for inside files.' },
          file_types: { type: 'string', description: 'Optional comma-separated file extensions to search within.' },
          search_path: { type: 'string', description: 'Optional folder path to search in.' }
        },
        required: ['query'],
      },
    },
  },
];

// Tool definitions for Anthropic format
const TOOLS_ANTHROPIC = [
  {
    name: 'findFile',
    description: 'Find a file on the user computer using natural language keywords. Use this when the user asks to find, locate, search for files, or asks "where is" something.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'File name, partial name, or content keywords to search for.' },
        file_types: { type: 'string', description: 'Optional comma-separated file extensions like "rs,js,py" to filter by file type.' },
        search_path: { type: 'string', description: 'Optional folder path to search in, e.g. "Downloads", "Documents", "Desktop".' }
      },
      required: ['query'],
    },
  },
  {
    name: 'searchContent',
    description: 'Search inside file contents for specific text, code, or patterns. Use when user wants to find files containing specific content.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text or code pattern to search for inside files.' },
        file_types: { type: 'string', description: 'Optional comma-separated file extensions to search within.' },
        search_path: { type: 'string', description: 'Optional folder path to search in.' }
      },
      required: ['query'],
    },
  },
];


// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategory(fileType: string, path: string): string {
  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('node_modules') || pathLower.includes('target') || pathLower.includes('.git')) {
    return 'Dev';
  }
  if (pathLower.includes('temp') || pathLower.includes('cache') || pathLower.includes('tmp')) {
    return 'Temp';
  }
  if (pathLower.includes('system') || pathLower.includes('log')) {
    return 'System';
  }
  if (pathLower.includes('document') || pathLower.includes('work')) {
    return 'Work';
  }
  if (pathLower.includes('picture') || pathLower.includes('photo') || pathLower.includes('image')) {
    return 'Personal';
  }
  
  switch (fileType?.toLowerCase()) {
    case 'rs': case 'js': case 'ts': case 'py': case 'java': case 'cpp': case 'c':
      return 'Dev';
    case 'pdf': case 'doc': case 'docx': case 'txt': case 'md':
      return 'Document';
    case 'jpg': case 'png': case 'gif': case 'svg':
      return 'Image';
    case 'mp3': case 'wav': case 'mp4': case 'avi':
      return 'Media';
    default:
      return 'Other';
  }
}

function convertFileSearchResults(backendResults: any, fileTypesFilter?: string) {
  const allowedExtensions = fileTypesFilter 
    ? fileTypesFilter.split(',').map(ext => ext.trim().toLowerCase())
    : null;

  let files = backendResults.merged_results?.map((result: any) => {
    // Extract filename from path (handle both / and \ separators)
    const pathParts = result.path.split(/[/\\]/);
    const fileName = pathParts[pathParts.length - 1] || result.path;
    
    return {
      id: result.path,
      name: fileName,
      path: result.path,
      size: result.size ? formatFileSize(result.size) : 'Unknown',
      category: detectCategory(result.file_type, result.path),
      safeToRemove: false,
      lastUsed: result.modified || 'Unknown',
      score: result.relevance_score,
      source: result.source_engine,
      snippet: result.snippet,
      fileType: result.file_type
    };
  }) || [];

  if (allowedExtensions && allowedExtensions.length > 0) {
    files = files.filter((f: any) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return allowedExtensions.includes(ext);
    });
  }

  return {
    files,
    searchInfo: {
      query: backendResults.query,
      totalResults: files.length,
      executionTime: backendResults.total_execution_time_ms,
      mode: backendResults.mode,
      suggestions: backendResults.suggestions || []
    }
  };
}

// AI Relevance Scoring - scores files 0-100 based on relevance to user query
async function scoreFilesWithAI(
  files: any[], 
  userMessage: string, 
  searchQuery: string,
  provider: AIProvider,
  apiKey: string,
  model: string,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  if (files.length === 0) return files;
  
  onStatusUpdate?.(`Scoring ${files.length} results for relevance...`);
  console.log('🤖 Using AI to score', files.length, 'results for relevance');
  
  const scoringPrompt = `Score these search results for relevance to: "${userMessage}"

Results to score (index, filename, path):
${files.slice(0, 50).map((f: any, i: number) => 
  `${i}. "${f.name}" - ${f.path}`
).join('\n')}

Return a JSON object with:
- "scores": array of {index, score, reason} where score is 0-100 (100 = perfect match)
- "top_results": array of indices for the most relevant results (max 15)

Scoring rules for "${searchQuery}":
- 100: Perfect match (exact filename match or highly relevant)
- 80-99: Strong match (contains key terms in filename)
- 50-79: Possible match (right file type, might be relevant)
- 20-49: Weak match (right extension but unlikely to be what user wants)
- 0-19: Not relevant (unrelated files, system files, etc.)

Be strict! Only files that truly match what the user is looking for should score high.`;

  try {
    let scoringResult: any = null;
    
    if (provider === 'google') {
      const response = await fetch(
        `${PROVIDER_CONFIGS.google.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: scoringPrompt }] }],
            generationConfig: { 
              temperature: 0.3,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json'
            },
          }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      scoringResult = JSON.parse(text);
    } else if (provider === 'openai') {
      const response = await fetch(`${PROVIDER_CONFIGS.openai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: scoringPrompt }],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      scoringResult = JSON.parse(text);
    } else if (provider === 'anthropic') {
      const response = await fetch(`${PROVIDER_CONFIGS.anthropic.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: scoringPrompt + '\n\nRespond with valid JSON only.' }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      scoringResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }
    
    if (scoringResult && scoringResult.scores) {
      const scores = scoringResult.scores || [];
      const topResults = scoringResult.top_results || [];
      
      console.log('📊 AI scoring results:', { 
        totalScored: scores.length, 
        topResults: topResults.length,
        scores: scores.slice(0, 5)
      });
      
      // Apply scores to files
      const scoredFiles = files.map((f: any, i: number) => {
        const scoreInfo = scores.find((s: any) => s.index === i);
        return {
          ...f,
          relevanceScore: scoreInfo?.score || 0,
          scoreReason: scoreInfo?.reason || 'Not scored'
        };
      });
      
      // Filter to only show relevant results (score >= 50) or top results
      const relevantIndices = new Set(topResults);
      const filteredFiles = scoredFiles
        .filter((f: any, i: number) => f.relevanceScore >= 50 || relevantIndices.has(i))
        .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 15);
      
      return filteredFiles;
    }
  } catch (error) {
    console.warn('Failed to score files with AI, using fallback:', error);
  }
  
  // Fallback: use backend score if available, otherwise simple keyword matching
  const keywords = searchQuery.toLowerCase().split(',').map((k: string) => k.trim());
  return files
    .map((f: any) => {
      // If backend already provided a score, use it (convert from 0-1 to 0-100)
      if (f.score !== undefined && f.score > 0) {
        const backendScore = Math.round(f.score * 100);
        return { ...f, relevanceScore: backendScore, scoreReason: f.source ? `via ${f.source}` : 'Backend score' };
      }
      
      // Otherwise, calculate based on keyword matching
      const nameLower = f.name.toLowerCase();
      const pathLower = f.path.toLowerCase();
      
      // Check for exact name match (highest score)
      const exactNameMatch = keywords.some((kw: string) => nameLower === kw || nameLower.startsWith(kw + '.'));
      if (exactNameMatch) {
        return { ...f, relevanceScore: 95, scoreReason: 'Exact match' };
      }
      
      // Check for name contains keyword
      const nameContains = keywords.some((kw: string) => nameLower.includes(kw));
      if (nameContains) {
        return { ...f, relevanceScore: 85, scoreReason: 'Name match' };
      }
      
      // Check for path contains keyword
      const pathContains = keywords.some((kw: string) => pathLower.includes(kw));
      if (pathContains) {
        return { ...f, relevanceScore: 70, scoreReason: 'Path match' };
      }
      
      return { ...f, relevanceScore: 50, scoreReason: 'Keyword match' };
    })
    .filter((f: any) => f.relevanceScore >= 50)
    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15);
}

// Execute file search with AI relevance scoring
async function executeFileSearch(
  args: any, 
  onStatusUpdate?: (status: string) => void,
  provider?: AIProvider,
  apiKey?: string,
  model?: string,
  userMessage?: string
): Promise<any> {
  console.log('🔍 Executing file search:', args);
  onStatusUpdate?.(`Searching for "${args.query}"...`);
  
  const searchOptions: any = {
    mode: 'hybrid',
    max_results: 100,
    include_indices: true,
  };
  
  if (args.file_types) searchOptions.file_types = args.file_types;
  if (args.search_path) searchOptions.search_path = args.search_path;
  
  try {
    const backendResults = await backendApi.aiFileSearch(args.query, searchOptions);
    const convertedResults = convertFileSearchResults(backendResults, args.file_types);
    
    // Apply AI relevance scoring if provider info is available
    let scoredFiles = convertedResults.files;
    let filterReason = 'No AI scoring';
    
    if (provider && apiKey && model && userMessage) {
      scoredFiles = await scoreFilesWithAI(
        convertedResults.files,
        userMessage,
        args.query,
        provider,
        apiKey,
        model,
        onStatusUpdate
      );
      filterReason = `AI scored ${convertedResults.files.length} files, showing ${scoredFiles.length} relevant results`;
    }
    
    // Log activity
    activityLogger.log(
      'File Search',
      args.query + (args.search_path ? ` in ${args.search_path}` : ''),
      `Found ${scoredFiles.length} relevant files (${convertedResults.files.length} total)`,
      'success',
      { executionTime: convertedResults.searchInfo.executionTime }
    );
    
    return {
      type: 'file_list',
      data: scoredFiles,
      searchInfo: {
        ...convertedResults.searchInfo,
        totalResults: scoredFiles.length,
        originalResults: convertedResults.files.length,
        filterReason
      }
    };
  } catch (error) {
    console.error('❌ File search failed:', error);
    activityLogger.log('File Search', args.query, 'Search failed', 'error');
    return {
      type: 'error',
      text: `File search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Execute content search
async function executeContentSearch(args: any, onStatusUpdate?: (status: string) => void): Promise<any> {
  console.log('🔍 Executing content search:', args);
  onStatusUpdate?.(`Searching content for "${args.query}"...`);
  
  const searchOptions: any = {};
  if (args.file_types) searchOptions.file_types = args.file_types;
  if (args.search_path) searchOptions.search_path = args.search_path;
  
  try {
    const backendResults = await backendApi.searchContent(args.query, searchOptions);
    const convertedResults = convertFileSearchResults(backendResults);
    
    activityLogger.log(
      'Content Search',
      args.query,
      `Found ${convertedResults.files.length} files`,
      'success'
    );
    
    return {
      type: 'file_list',
      data: convertedResults.files.slice(0, 20),
      searchInfo: convertedResults.searchInfo
    };
  } catch (error) {
    console.error('❌ Content search failed:', error);
    return {
      type: 'error',
      text: `Content search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}


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
    // Check if model supports vision - use exact model name matching
    const visionModels = [
      'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview', 
      'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
      'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'
    ];
    
    // Check if the model name contains any of the vision model identifiers
    const supportsVision = visionModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
    
    console.log('[aiService] Vision support check:', {
      model,
      supportsVision,
      matchedModel: visionModels.find(vm => model.toLowerCase().includes(vm.toLowerCase()))
    });
    
    const visionCapabilities = supportsVision ? `

VISION CAPABILITIES:
- You CAN see and analyze images that users attach to their messages
- You have OCR capabilities to read text from images (screenshots, documents, signs, etc.)
- You can describe what's in images, identify objects, people, and scenes
- You can answer questions about image content
- When users attach images, analyze them and respond based on what you see
- NEVER say you cannot see images - you have full vision capabilities` : '';
    
    return `You are Skhoot, a helpful desktop assistant.

CRITICAL IDENTITY RULES (NEVER IGNORE):
- Your name is "Skhoot"
- You are powered by ${provider} using the ${model} model
- When asked "what model are you?", "who are you?", "what AI are you?", you MUST answer: "I am Skhoot, powered by ${provider} (${model})"
- NEVER say you are "a large language model by Google" or similar generic responses
- ALWAYS identify as Skhoot first, then mention your underlying technology

YOUR CAPABILITIES:
- Finding files on the user's computer using the findFile function
- Searching inside file contents using the searchContent function
- Answering questions and providing helpful information
- Assisting with various tasks${visionCapabilities}
- Answering questions and providing helpful information
- Assisting with various tasks${visionCapabilities}

IMPORTANT - AGENT MODE:
- For system commands, terminal operations, or questions about the computer (disk space, processes, system info), tell the user to enable Agent Mode
- Say: "I can help with that! Please enable Agent Mode (click the CPU icon or press Ctrl+Shift+A) to let me run system commands."
- Agent Mode gives you access to shell commands, file operations, and more

FILE SEARCH RULES:
1. When users ask to find, locate, or search for FILES by name, use the findFile function
2. When users ask what files CONTAIN or SAY about something, use searchContent
3. When users mention specific folders like "Downloads", "Documents", "Desktop", pass that as the search_path parameter

SEMANTIC SEARCH STRATEGY:
Expand conceptual searches intelligently:
- "pitch deck" → query="pitch,deck,presentation,investor" with file_types="pdf,pptx,ppt,key"
- "resume" or "CV" → query="resume,cv,curriculum" with file_types="pdf,doc,docx"
- "photo" or "picture" → query="photo,picture,image" with file_types="jpg,jpeg,png,heic"

Be concise, friendly, and helpful. Always explain what you found or why you couldn't find something.`;
  }

  /**
   * Main chat function - routes to the active provider with file search capabilities
   */
  async chat(
    message: string,
    history: AIMessage[] = [],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
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
      
      switch (provider) {
        case 'openai':
          return await this.chatWithOpenAI(apiKey, message, history, onStatusUpdate, images);
        case 'google':
          return await this.chatWithGoogle(apiKey, message, history, onStatusUpdate, images);
        case 'anthropic':
          return await this.chatWithAnthropic(apiKey, message, history, onStatusUpdate, images);
        case 'custom':
          return await this.chatWithCustom(apiKey, message, history, onStatusUpdate, images);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`[AIService] Chat failed with ${provider}:`, error);
      return {
        text: `❌ Error with ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        provider,
      };
    }
  }

  /**
   * Chat with OpenAI (with function calling and vision support)
   */
  private async chatWithOpenAI(
    apiKey: string,
    message: string,
    history: AIMessage[],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
  ): Promise<AIResponse> {
    onStatusUpdate?.('Connecting to OpenAI...');
    
    console.log('[aiService] chatWithOpenAI called with:', {
      messageLength: message.length,
      historyLength: history.length,
      imagesCount: images?.length || 0,
      historyWithImages: history.filter(m => m.images && m.images.length > 0).length
    });
    
    const savedModel = await apiKeyService.loadModel('openai');
    const model = savedModel || this.config.customModel || PROVIDER_CONFIGS.openai.defaultModel;
    
    // Build messages with vision support
    const messages: any[] = [
      { role: 'system', content: this.getSystemPrompt('openai', model) },
      ...history.map(m => {
        if (m.images && m.images.length > 0) {
          // Message with images - use vision format
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map(img => ({
                type: 'image_url',
                image_url: {
                  url: `data:${img.mimeType};base64,${img.base64}`
                }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      })
    ];
    
    // Add current message with images if provided
    if (images && images.length > 0) {
      console.log('[aiService] Adding images to message:', images.length, 'images');
      console.log('[aiService] First image info:', {
        fileName: images[0].fileName,
        mimeType: images[0].mimeType,
        base64Length: images[0].base64.length
      });
      
      // Check if model supports vision
      const visionModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview'];
      if (!visionModels.includes(model)) {
        console.warn(`[aiService] Model ${model} may not support vision. Recommended models: ${visionModels.join(', ')}`);
      }
      
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...images.map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
              detail: 'high' // Use high detail for better OCR
            }
          }))
        ]
      });
      onStatusUpdate?.(`Analyzing ${images.length} image(s) with GPT-4 Vision...`);
    } else {
      console.log('[aiService] No images provided, sending text only');
      messages.push({ role: 'user', content: message });
    }

    // First call with tools
    console.log('[aiService] Sending request to OpenAI with:', {
      model,
      messagesCount: messages.length,
      lastMessageType: typeof messages[messages.length - 1].content,
      lastMessageHasImages: Array.isArray(messages[messages.length - 1].content),
      requestBody: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          contentType: typeof m.content,
          contentLength: Array.isArray(m.content) ? m.content.length : m.content?.length || 0
        }))
      })
    });
    
    const response = await fetch(`${PROVIDER_CONFIGS.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS_OPENAI,
        tool_choice: 'auto',
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;
    
    // Check for tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      let toolResult: any;
      if (functionName === 'findFile') {
        toolResult = await executeFileSearch(args, onStatusUpdate, 'openai', apiKey, model, message);
      } else if (functionName === 'searchContent') {
        toolResult = await executeContentSearch(args, onStatusUpdate);
      }
      
      if (toolResult && toolResult.type === 'file_list') {
        // Get AI to summarize the results
        const summaryMessages = [
          ...messages,
          assistantMessage,
          { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) }
        ];
        
        const summaryResponse = await fetch(`${PROVIDER_CONFIGS.openai.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: summaryMessages,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
        
        const summaryData = await summaryResponse.json();
        const summaryText = summaryData.choices?.[0]?.message?.content || `Found ${toolResult.data.length} files.`;
        
        return {
          text: summaryText,
          type: 'file_list',
          data: toolResult.data,
          provider: 'openai',
          model,
          searchInfo: toolResult.searchInfo,
        };
      }
    }

    return {
      text: assistantMessage?.content || '',
      type: 'text',
      provider: 'openai',
      model,
    };
  }


  /**
   * Chat with Google Gemini (with function calling and vision support)
   */
  private async chatWithGoogle(
    apiKey: string,
    message: string,
    history: AIMessage[],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
  ): Promise<AIResponse> {
    onStatusUpdate?.('Connecting to Google Gemini...');
    
    console.log('[aiService] chatWithGoogle called with:', {
      messageLength: message.length,
      historyLength: history.length,
      imagesCount: images?.length || 0,
      historyWithImages: history.filter(m => m.images && m.images.length > 0).length
    });
    
    const savedModel = await apiKeyService.loadModel('google');
    const model = savedModel || this.config.customModel || PROVIDER_CONFIGS.google.defaultModel;
    
    console.log('[aiService] Using Gemini model:', model);
    
    // Convert history to Gemini format with vision support
    const contents: any[] = [
      ...history.map(m => {
        const parts: any[] = [{ text: m.content }];
        if (m.images && m.images.length > 0) {
          console.log(`[aiService] Adding ${m.images.length} images from history message`);
          // Add images as inline data
          m.images.forEach(img => {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64
              }
            });
          });
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      })
    ];
    
    // Add current message with images if provided
    const currentParts: any[] = [{ text: message }];
    if (images && images.length > 0) {
      console.log('[aiService] Adding images to current message:', images.length, 'images');
      console.log('[aiService] First image info:', {
        fileName: images[0].fileName,
        mimeType: images[0].mimeType,
        base64Length: images[0].base64.length
      });
      
      images.forEach(img => {
        currentParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64
          }
        });
      });
      onStatusUpdate?.(`Analyzing ${images.length} image(s) with Gemini Vision...`);
    }
    contents.push({ role: 'user', parts: currentParts });

    // Gemini tool format
    const tools = [{
      functionDeclarations: [
        {
          name: 'findFile',
          description: 'Find a file on the user computer using natural language keywords.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: { type: 'STRING', description: 'File name or keywords to search for.' },
              file_types: { type: 'STRING', description: 'Optional comma-separated file extensions.' },
              search_path: { type: 'STRING', description: 'Optional folder path to search in.' }
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
              query: { type: 'STRING', description: 'Text to search for inside files.' },
              file_types: { type: 'STRING', description: 'Optional file extensions to search within.' },
              search_path: { type: 'STRING', description: 'Optional folder path to search in.' }
            },
            required: ['query'],
          },
        },
      ]
    }];

    const systemPrompt = this.getSystemPrompt('google', model);
    console.log('[aiService] System prompt includes vision:', systemPrompt.includes('VISION CAPABILITIES'));
    console.log('[aiService] System prompt length:', systemPrompt.length);
    
    const requestBody = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools,
      generationConfig: {
        temperature: this.config.temperature ?? 0.7,
        maxOutputTokens: this.config.maxTokens ?? 4096,
      },
    };
    
    console.log('[aiService] Sending request to Gemini:', {
      model,
      contentsCount: contents.length,
      lastContentParts: contents[contents.length - 1].parts.length,
      hasImages: contents[contents.length - 1].parts.some((p: any) => p.inlineData),
      systemInstructionLength: systemPrompt.length
    });
    
    const response = await fetch(
      `${PROVIDER_CONFIGS.google.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[aiService] Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      throw new Error(error.error?.message || `Google API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[aiService] Gemini response:', {
      hasCandidates: !!data.candidates,
      candidatesCount: data.candidates?.length || 0,
      firstCandidateContent: data.candidates?.[0]?.content ? 'present' : 'missing',
      firstCandidateParts: data.candidates?.[0]?.content?.parts?.length || 0
    });
    
    const candidate = data.candidates?.[0];
    const content = candidate?.content;
    
    // Check for function calls
    const functionCall = content?.parts?.find((p: any) => p.functionCall);
    if (functionCall) {
      const fc = functionCall.functionCall;
      const args = fc.args;
      
      let toolResult: any;
      if (fc.name === 'findFile') {
        toolResult = await executeFileSearch(args, onStatusUpdate, 'google', apiKey, model, message);
      } else if (fc.name === 'searchContent') {
        toolResult = await executeContentSearch(args, onStatusUpdate);
      }
      
      if (toolResult && toolResult.type === 'file_list') {
        // Get AI to summarize results
        const summaryContents = [
          ...contents,
          { role: 'model', parts: [{ functionCall: fc }] },
          { role: 'user', parts: [{ functionResponse: { name: fc.name, response: toolResult } }] }
        ];
        
        const summaryResponse = await fetch(
          `${PROVIDER_CONFIGS.google.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: summaryContents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
          }
        );
        
        const summaryData = await summaryResponse.json();
        const summaryText = summaryData.candidates?.[0]?.content?.parts?.[0]?.text || `Found ${toolResult.data.length} files.`;
        
        return {
          text: summaryText,
          type: 'file_list',
          data: toolResult.data,
          provider: 'google',
          model,
          searchInfo: toolResult.searchInfo,
        };
      }
    }

    const textContent = content?.parts?.[0]?.text || '';
    return {
      text: textContent,
      type: 'text',
      provider: 'google',
      model,
    };
  }

  /**
   * Chat with Anthropic Claude (with tool use and vision support)
   */
  private async chatWithAnthropic(
    apiKey: string,
    message: string,
    history: AIMessage[],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
  ): Promise<AIResponse> {
    onStatusUpdate?.('Connecting to Anthropic Claude...');
    
    const savedModel = await apiKeyService.loadModel('anthropic');
    const model = savedModel || this.config.customModel || PROVIDER_CONFIGS.anthropic.defaultModel;
    
    // Build messages with vision support
    const messages: any[] = [
      ...history.map(m => {
        if (m.images && m.images.length > 0) {
          // Message with images - use vision format
          const content: any[] = [{ type: 'text', text: m.content }];
          m.images.forEach(img => {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.base64
              }
            });
          });
          return { role: m.role, content };
        }
        return { role: m.role, content: m.content };
      })
    ];
    
    // Add current message with images if provided
    if (images && images.length > 0) {
      const content: any[] = [{ type: 'text', text: message }];
      images.forEach(img => {
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
      onStatusUpdate?.(`Analyzing ${images.length} image(s) with Claude Vision...`);
    } else {
      messages.push({ role: 'user', content: message });
    }

    const response = await fetch(`${PROVIDER_CONFIGS.anthropic.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: this.config.maxTokens ?? 4096,
        system: this.getSystemPrompt('anthropic', model),
        messages,
        tools: TOOLS_ANTHROPIC,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for tool use
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    if (toolUse) {
      const args = toolUse.input;
      
      let toolResult: any;
      if (toolUse.name === 'findFile') {
        toolResult = await executeFileSearch(args, onStatusUpdate, 'anthropic', apiKey, model, message);
      } else if (toolUse.name === 'searchContent') {
        toolResult = await executeContentSearch(args, onStatusUpdate);
      }
      
      if (toolResult && toolResult.type === 'file_list') {
        // Get AI to summarize results
        const summaryMessages = [
          ...messages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] }
        ];
        
        const summaryResponse = await fetch(`${PROVIDER_CONFIGS.anthropic.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            messages: summaryMessages,
          }),
        });
        
        const summaryData = await summaryResponse.json();
        const summaryText = summaryData.content?.[0]?.text || `Found ${toolResult.data.length} files.`;
        
        return {
          text: summaryText,
          type: 'file_list',
          data: toolResult.data,
          provider: 'anthropic',
          model,
          searchInfo: toolResult.searchInfo,
        };
      }
    }

    const textContent = data.content?.find((c: any) => c.type === 'text')?.text || '';
    return {
      text: textContent,
      type: 'text',
      provider: 'anthropic',
      model,
    };
  }


  /**
   * Chat with Custom endpoint (OpenAI-compatible with tools and vision)
   */
  private async chatWithCustom(
    apiKey: string,
    message: string,
    history: AIMessage[],
    onStatusUpdate?: (status: string) => void,
    images?: Array<{ fileName: string; base64: string; mimeType: string }>
  ): Promise<AIResponse> {
    const endpoint = this.config.customEndpoint;
    
    if (!endpoint) {
      throw new Error('Custom endpoint not configured. Please set it in User Profile.');
    }

    onStatusUpdate?.(`Connecting to ${endpoint}...`);
    
    const savedModel = await apiKeyService.loadModel('custom');
    const model = savedModel || this.config.customModel || 'default';
    
    // Build messages with vision support (OpenAI format)
    const messages: any[] = [
      { role: 'system', content: this.getSystemPrompt('custom', model) },
      ...history.map(m => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map(img => ({
                type: 'image_url',
                image_url: {
                  url: `data:${img.mimeType};base64,${img.base64}`
                }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      })
    ];
    
    // Add current message with images if provided
    if (images && images.length > 0) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...images.map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`
            }
          }))
        ]
      });
      onStatusUpdate?.(`Analyzing ${images.length} image(s)...`);
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Try with tools first, fallback to simple chat if not supported
    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: TOOLS_OPENAI,
          tool_choice: 'auto',
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        throw new Error('Tools not supported');
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message;
      
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolCall = assistantMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        let toolResult: any;
        if (functionName === 'findFile') {
          toolResult = await executeFileSearch(args, onStatusUpdate, 'custom', apiKey, model, message);
        } else if (functionName === 'searchContent') {
          toolResult = await executeContentSearch(args, onStatusUpdate);
        }
        
        if (toolResult && toolResult.type === 'file_list') {
          return {
            text: `Found ${toolResult.data.length} files matching your search.`,
            type: 'file_list',
            data: toolResult.data,
            provider: 'custom',
            model,
            searchInfo: toolResult.searchInfo,
          };
        }
      }

      return {
        text: assistantMessage?.content || '',
        type: 'text',
        provider: 'custom',
        model,
      };
    } catch {
      // Fallback to simple chat without tools
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Custom API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        type: 'text',
        provider: 'custom',
        model,
      };
    }
  }

  getModelsForProvider(provider: AIProvider): string[] {
    return PROVIDER_CONFIGS[provider]?.models || [];
  }

  getDefaultModel(provider: AIProvider): string {
    return PROVIDER_CONFIGS[provider]?.defaultModel || '';
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
