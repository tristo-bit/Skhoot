import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MOCK_FILES, MOCK_MESSAGES } from "../src/constants";
import { backendApi } from "./backendApi";
import { activityLogger } from "./activityLogger";

const findFileFunction: FunctionDeclaration = {
  name: 'findFile',
  parameters: {
    type: Type.OBJECT,
    description: 'Find a file on the user computer using natural language keywords. Use this when the user asks to find, locate, search for files, or asks "where is" something.',
    properties: {
      query: { type: Type.STRING, description: 'File name, partial name, or content keywords to search for.' },
      file_types: { type: Type.STRING, description: 'Optional comma-separated file extensions like "rs,js,py" to filter by file type.' },
      search_mode: { type: Type.STRING, description: 'Search mode: "auto" (default), "rust" (fast fuzzy), "cli" (system tools), or "hybrid".' }
    },
    required: ['query'],
  },
};

const searchContentFunction: FunctionDeclaration = {
  name: 'searchContent',
  parameters: {
    type: Type.OBJECT,
    description: 'Search inside file contents for specific text, code, or patterns. Use when user wants to find files containing specific content.',
    properties: {
      query: { type: Type.STRING, description: 'Text or code pattern to search for inside files.' },
      file_types: { type: Type.STRING, description: 'Optional comma-separated file extensions to search within.' },
      case_sensitive: { type: Type.BOOLEAN, description: 'Whether the search should be case sensitive.' }
    },
    required: ['query'],
  },
};

const findMessageFunction: FunctionDeclaration = {
  name: 'findMessage',
  parameters: {
    type: Type.OBJECT,
    description: 'Find a conversation message from connected apps like Slack, Discord, or iMessage.',
    properties: {
      keywords: { type: Type.STRING, description: 'Keywords from the message content.' },
      app: { type: Type.STRING, description: 'Optional app filter.' }
    },
    required: ['keywords'],
  },
};

const analyzeDiskSpaceFunction: FunctionDeclaration = {
  name: 'analyzeDiskSpace',
  parameters: {
    type: Type.OBJECT,
    description: 'Analyze what is taking space on the computer.',
    properties: {},
  },
};

const checkFileSafetyFunction: FunctionDeclaration = {
  name: 'checkFileSafety',
  parameters: {
    type: Type.OBJECT,
    description: 'Check if a specific file or folder is safely removable.',
    properties: {
      filePath: { type: Type.STRING, description: 'The path of the file to check.' }
    },
    required: ['filePath'],
  },
};

const analyzeLogsFunction: FunctionDeclaration = {
  name: 'analyzeLogs',
  parameters: {
    type: Type.OBJECT,
    description: 'Find and analyze system logs or bug reports.',
    properties: {
      errorType: { type: Type.STRING, description: 'Optional error type or app name.' }
    },
  },
};

// Helper function to detect if a message needs file search
async function shouldSuggestFileSearch(message: string): Promise<boolean> {
  try {
    const suggestion = await backendApi.getSearchSuggestions({
      prompt: message,
      project_type: 'web', // Could be detected from current directory
    });
    return suggestion.should_suggest_file_search;
  } catch (error) {
    console.warn('Failed to get search suggestions:', error);
    // Fallback to simple keyword detection
    const fileSearchKeywords = [
      'find', 'locate', 'search', 'where', 'show me', 'get', 'open',
      'file', 'files', 'document', 'folder', 'directory',
      '.js', '.ts', '.py', '.rs', '.json', '.md', '.txt', '.pdf',
      'config', 'settings', 'readme', 'package', 'cargo'
    ];
    
    const lowerMessage = message.toLowerCase();
    return fileSearchKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

// Helper function to convert backend results to frontend format
function convertFileSearchResults(backendResults: any) {
  const files = backendResults.merged_results?.map((result: any) => ({
    id: result.path,
    name: result.path.split('/').pop() || result.path,
    path: result.path,
    size: result.size ? formatFileSize(result.size) : 'Unknown',
    category: detectCategory(result.file_type, result.path),
    safeToRemove: false, // Would need additional logic
    lastUsed: result.modified || 'Unknown',
    score: result.relevance_score,
    source: result.source_engine,
    snippet: result.snippet
  })) || [];

  return {
    files,
    searchInfo: {
      query: backendResults.query,
      totalResults: backendResults.merged_results?.length || 0,
      executionTime: backendResults.total_execution_time_ms,
      mode: backendResults.mode,
      suggestions: backendResults.suggestions || []
    }
  };
}

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
  
  // Categorize by file type
  switch (fileType.toLowerCase()) {
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

export const geminiService = {
  async chat(message: string, history: any[] = []) {
    // Creating a new GoogleGenAI instance inside the function to ensure up-to-date API key access
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // Check if this message should trigger file search suggestions
    const shouldSuggest = await shouldSuggestFileSearch(message);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `You are Skhoot, a helpful desktop assistant with advanced file search capabilities. 

IMPORTANT: When users ask to find, locate, search for files, or ask "where is" something, ALWAYS use the findFile function. When they want to search inside files for specific content, use searchContent.

You have access to a powerful file search system that can:
- Find files by name using fuzzy matching
- Search file contents for specific text or code
- Use multiple search engines (Rust-based fuzzy search, CLI tools like ripgrep/fd)
- Provide intelligent suggestions and context-aware results

${shouldSuggest ? '\n🔍 SUGGESTION: This message appears to be asking about files. Consider using the file search functions.' : ''}

Respond naturally and use the appropriate search functions when needed.`,
          tools: [{ functionDeclarations: [
            findFileFunction,
            searchContentFunction,
            findMessageFunction, 
            analyzeDiskSpaceFunction, 
            checkFileSafetyFunction,
            analyzeLogsFunction
          ]}],
        },
      });

      // Handle case where response might be empty
      if (!response) {
        return { text: "I'm here to help! What can I assist you with?", type: 'text' };
      }

      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const fc = functionCalls[0];
        let result: any = null;

        if (fc.name === 'findFile') {
          try {
            const args = fc.args as any;
            console.log('🔍 AI triggered file search:', args);
            
            const searchOptions: any = {
              mode: args.search_mode || 'auto',
              max_results: 50,
              include_indices: true,
            };
            
            if (args.file_types) {
              searchOptions.file_types = args.file_types;
            }
            
            const backendResults = await backendApi.aiFileSearch(args.query, searchOptions);
            const convertedResults = convertFileSearchResults(backendResults);
            
            result = { 
              type: 'file_list', 
              data: convertedResults.files,
              searchInfo: convertedResults.searchInfo
            };
            
            console.log('✅ File search completed:', {
              query: args.query,
              results: convertedResults.files.length,
              time: convertedResults.searchInfo.executionTime + 'ms'
            });

            // Log the activity
            activityLogger.log(
              'File Search',
              args.query,
              `Found ${convertedResults.files.length} files`,
              'success',
              { executionTime: convertedResults.searchInfo.executionTime }
            );
            
          } catch (error) {
            console.error('❌ File search failed:', error);
            
            // Log the failed activity
            activityLogger.log(
              'File Search',
              (fc.args as any).query,
              'Search failed - using fallback',
              'error'
            );
            
            // Fallback to mock data if backend fails
            const q = (fc.args as any).query.toLowerCase();
            result = { 
              type: 'file_list', 
              data: MOCK_FILES.filter(f => 
                f.name.toLowerCase().includes(q) || 
                f.category.toLowerCase().includes(q)
              ),
              searchInfo: {
                query: q,
                totalResults: 0,
                executionTime: 0,
                mode: 'fallback',
                error: 'Backend search failed, showing cached results'
              }
            };
          }
          
        } else if (fc.name === 'searchContent') {
          try {
            const args = fc.args as any;
            console.log('🔍 AI triggered content search:', args);
            
            const searchOptions: any = {};
            if (args.file_types) searchOptions.file_types = args.file_types;
            if (args.case_sensitive) searchOptions.case_sensitive = args.case_sensitive;
            
            const backendResults = await backendApi.searchContent(args.query, searchOptions);
            const convertedResults = convertFileSearchResults(backendResults);
            
            result = { 
              type: 'file_list', 
              data: convertedResults.files,
              searchInfo: convertedResults.searchInfo
            };
            
            console.log('✅ Content search completed:', {
              query: args.query,
              results: convertedResults.files.length,
              time: convertedResults.searchInfo.executionTime + 'ms'
            });

            // Log the activity
            activityLogger.log(
              'Content Search',
              args.query,
              `Found ${convertedResults.files.length} files`,
              'success',
              { executionTime: convertedResults.searchInfo.executionTime }
            );
            
          } catch (error) {
            console.error('❌ Content search failed:', error);
            
            // Log the failed activity
            activityLogger.log(
              'Content Search',
              (fc.args as any).query,
              'Search failed',
              'error'
            );
            
            result = { 
              type: 'analysis', 
              content: `I encountered an error while searching for "${(fc.args as any).query}" in file contents. Please try a different search term or check if the backend is running.`
            };
          }
          
        } else if (fc.name === 'findMessage') {
          const q = (fc.args as any).keywords.toLowerCase();
          const messages = MOCK_MESSAGES.filter(m => m.text.toLowerCase().includes(q) || m.user.toLowerCase().includes(q));
          result = { type: 'message_list', data: messages };
          
          // Log the activity
          activityLogger.log(
            'Message Search',
            q,
            `Found ${messages.length} messages`,
            'success'
          );
        } else if (fc.name === 'analyzeDiskSpace') {
          result = { type: 'disk_usage', data: [...MOCK_FILES].sort((b) => b.size.includes('GB') ? 1 : -1) };
          
          // Log the activity
          activityLogger.log(
            'Disk Analysis',
            'Full scan',
            'Analysis complete',
            'success'
          );
        } else if (fc.name === 'checkFileSafety') {
          const path = (fc.args as any).filePath;
          const file = MOCK_FILES.find(f => f.path.includes(path) || f.name.includes(path));
          result = { type: 'analysis', content: file?.safeToRemove ? `The file "${file.name}" is a temporary file and can be safely removed.` : `I wouldn't recommend removing "${file?.name || path}". It appears to be a system or personal file.` };
        } else if (fc.name === 'analyzeLogs') {
          result = { type: 'analysis', content: "I've analyzed the kernel logs. It looks like a memory overflow occurred in the graphics driver on Jan 5th. Updating your GPU drivers might help." };
        }

        // Continuing the generation with tool response part including the function call id
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [{ functionCall: fc }] },
            { role: 'user', parts: [{ functionResponse: { id: fc.id, name: fc.name, response: { result } } }] }
          ]
        });

        return {
          text: finalResponse?.text || "Here's what I found.",
          type: result?.type || 'text',
          data: result?.data,
          searchInfo: result?.searchInfo
        };
      }

      const responseText = response.text || "I'm here! How can I help you?";
      return { text: responseText, type: 'text' };
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      // Provide more specific error messages
      if (error?.message?.includes('API key')) {
        return { text: "API key error: Please check that your VITE_GEMINI_API_KEY is valid in the .env file.", type: 'text' };
      }
      if (error?.message?.includes('quota') || error?.message?.includes('rate')) {
        return { text: "API quota exceeded. Please wait a moment and try again.", type: 'text' };
      }
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        return { text: "Network error: Unable to reach the Gemini API. Please check your internet connection.", type: 'text' };
      }
      
      return { text: `I encountered an error: ${error?.message || 'Unknown error'}. Check the browser console for details.`, type: 'text' };
    }
  }
};