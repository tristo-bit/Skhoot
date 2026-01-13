import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MOCK_FILES, MOCK_MESSAGES } from "../src/constants";
import { backendApi } from "./backendApi";
import { activityLogger } from "./activityLogger";
import { apiKeyService } from "./apiKeyService";

const findFileFunction: FunctionDeclaration = {
  name: 'findFile',
  parameters: {
    type: Type.OBJECT,
    description: 'Find a file on the user computer using natural language keywords. Use this when the user asks to find, locate, search for files, or asks "where is" something.',
    properties: {
      query: { type: Type.STRING, description: 'File name, partial name, or content keywords to search for. For conceptual searches like "pitch deck", use related terms like "pitch,deck,presentation,investor" to match various possible filenames.' },
      file_types: { type: Type.STRING, description: 'Optional comma-separated file extensions like "rs,js,py" to filter by file type. For presentations use "pdf,pptx,ppt,key". For documents use "pdf,doc,docx,txt,md".' },
      search_mode: { type: Type.STRING, description: 'Search mode: "auto" (default), "rust" (fast fuzzy), "cli" (system tools), or "hybrid".' },
      search_path: { type: Type.STRING, description: 'Optional folder path to search in, e.g. "Downloads", "Documents", "Desktop". Use when user mentions a specific folder.' }
    },
    required: ['query'],
  },
};

const searchContentFunction: FunctionDeclaration = {
  name: 'searchContent',
  parameters: {
    type: Type.OBJECT,
    description: 'Search inside file contents for specific text, code, or patterns. Use when user wants to find files containing specific content, asks what files say about something, or wants to know what is written in files about a topic.',
    properties: {
      query: { type: Type.STRING, description: 'Text or code pattern to search for inside files.' },
      file_types: { type: Type.STRING, description: 'Optional comma-separated file extensions to search within.' },
      case_sensitive: { type: Type.BOOLEAN, description: 'Whether the search should be case sensitive.' },
      search_path: { type: Type.STRING, description: 'Optional folder path to search in, e.g. "Downloads", "Documents", "Desktop". Use when user mentions a specific folder.' }
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

const filterResultsFunction: FunctionDeclaration = {
  name: 'filterResults',
  parameters: {
    type: Type.OBJECT,
    description: 'After receiving search results, use this to filter and return only the relevant files to the user. Analyze each file path and decide if it matches what the user is looking for.',
    properties: {
      relevant_indices: { 
        type: Type.ARRAY, 
        description: 'Array of indices (0-based) of the results that are relevant to show to the user. If no results are relevant, pass an empty array.',
        items: { type: Type.NUMBER }
      },
      reason: { type: Type.STRING, description: 'Brief explanation of why these results were selected or why none were relevant.' }
    },
    required: ['relevant_indices', 'reason'],
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
      'config', 'settings', 'readme', 'package', 'cargo',
      // Content search keywords
      'what do', 'what does', 'say about', 'says about', 'mention', 'mentions',
      'contain', 'contains', 'written', 'tell me about', 'downloads', 'documents',
      'desktop', 'in my files', 'in the files'
    ];
    
    const lowerMessage = message.toLowerCase();
    return fileSearchKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

// Helper function to convert backend results to frontend format
function convertFileSearchResults(backendResults: any, fileTypesFilter?: string) {
  // Parse file types filter if provided
  const allowedExtensions = fileTypesFilter 
    ? fileTypesFilter.split(',').map(ext => ext.trim().toLowerCase())
    : null;

  console.log('📁 File type filter:', allowedExtensions);

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

  const beforeFilterCount = files.length;

  // Filter by file types if specified
  if (allowedExtensions && allowedExtensions.length > 0) {
    files = files.filter((f: any) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const included = allowedExtensions.includes(ext);
      if (included) {
        console.log('✅ Including:', f.name, `(ext: ${ext})`);
      }
      return included;
    });
  }

  console.log(`📊 Filtered ${beforeFilterCount} → ${files.length} files`);

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
  async chat(message: string, history: any[] = [], onStatusUpdate?: (status: string) => void) {
    // Load API key from secure storage (apiKeyService) instead of .env
    let apiKey: string;
    try {
      apiKey = await apiKeyService.loadKey('google');
    } catch (error) {
      throw new Error('Google API key not configured. Please add your API key in User Profile → API Configuration.');
    }
    
    // Load saved model or use default
    const savedModel = await apiKeyService.loadModel('google');
    const modelName = savedModel || 'gemini-2.0-flash';
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Check if this message should trigger file search suggestions
    const shouldSuggest = await shouldSuggestFileSearch(message);
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `You are Skhoot, a helpful desktop assistant with advanced file search capabilities. 

IMPORTANT FILE SEARCH RULES:
1. When users ask to find, locate, or search for FILES by name, use the findFile function.
2. When users ask what files SAY or CONTAIN about something, or ask about CONTENT inside files, use searchContent.
3. When users mention specific folders like "Downloads", "Documents", "Desktop", pass that as the search_path parameter.
4. CRITICAL: After receiving search results, you MUST analyze each result's file path and use filterResults to select ONLY the relevant files. Do NOT show irrelevant results like source code files when looking for documents.

SEMANTIC SEARCH STRATEGY:
When users search for conceptual terms (not literal filenames), expand the search intelligently:
- "pitch deck" → query="pitch,deck,presentation,investor,startup" with file_types="pdf,pptx,ppt,key,odp"
- "resume" or "CV" → query="resume,cv,curriculum" with file_types="pdf,doc,docx"
- "contract" → query="contract,agreement,nda,terms" with file_types="pdf,doc,docx"
- "invoice" → query="invoice,receipt,bill,payment" with file_types="pdf,xlsx,xls"
- "photo" or "picture" → query="photo,picture,image,img" with file_types="jpg,jpeg,png,heic"
- "documentation about X" or "docs for X" → query="readme,documentation,docs,X" with file_types="md,txt,pdf,doc" and search_path to project directory if mentioned
- "moebius project" or similar project names → search in /home/moebius/dev/projects/moebius or similar paths

PROJECT DOCUMENTATION SEARCH:
When users ask for documentation about a project:
1. First try searching with the project name in the query
2. Use file_types="md,txt,pdf,doc,docx" to find documentation files
3. If the project name is mentioned (e.g., "moebius"), set search_path to likely project locations like "/home/moebius/dev/projects/moebius"
4. Look for README*, docs/*, *.md files

RESULT FILTERING RULES:
After search results come back, analyze each file path carefully:
- For "pitch deck": Only include actual presentation files (.pptx, .ppt, .key, .pdf) that look like presentations, NOT source code files like .tsx, .ts, .js, NOT icon files like .svg
- For "resume": Only include document files that could be resumes, NOT code files
- For documents: Exclude files in node_modules, .git, target, src directories unless specifically looking for code
- If NO results are truly relevant, use filterResults with an empty array and explain that nothing was found

Examples of when to use searchContent:
- "What do my files say about X?" → searchContent with query="X"
- "Tell me about the user's downloads, what do they say of him?" → searchContent with query="user" and search_path="Downloads"
- "Find files that mention the project deadline" → searchContent with query="project deadline"

Examples of when to use findFile:
- "Find my pitch deck" → findFile with query="pitch,deck,presentation,investor" and file_types="pdf,pptx,ppt,key"
- "Find my resume" → findFile with query="resume,cv" and file_types="pdf,doc,docx"
- "Where is the config file?" → findFile with query="config"
- "Show me PDF files in Downloads" → findFile with query="*.pdf" and search_path="Downloads"

${shouldSuggest ? '\n🔍 SUGGESTION: This message appears to be asking about files. Consider using the file search functions.' : ''}

Always be helpful and explain what you found or why you couldn't find what the user was looking for.`,
          tools: [{ functionDeclarations: [
            findFileFunction,
            searchContentFunction,
            filterResultsFunction,
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
            
            onStatusUpdate?.(`Searching for "${args.query}"...`);
            
            // Always use hybrid search - it runs both CLI glob and fuzzy in parallel
            const searchOptions: any = {
              mode: 'hybrid',
              max_results: 100, // Get more results for AI to score
              include_indices: true,
            };
            
            if (args.file_types) {
              searchOptions.file_types = args.file_types;
            }
            if (args.search_path) {
              searchOptions.search_path = args.search_path;
            }
            
            onStatusUpdate?.(`Running hybrid search (CLI + fuzzy)...`);
            const backendResults = await backendApi.aiFileSearch(args.query, searchOptions);
            const convertedResults = convertFileSearchResults(backendResults, args.file_types);
            
            // If no results found and query mentions a project name, try searching in project directories
            if (convertedResults.files.length === 0 || convertedResults.files.length < 5) {
              const projectKeywords = ['moebius', 'project', 'documentation', 'docs', 'readme'];
              const queryLower = args.query.toLowerCase();
              const mentionsProject = projectKeywords.some(kw => queryLower.includes(kw));
              
              if (mentionsProject) {
                onStatusUpdate?.(`Searching in project directories...`);
                
                // Try searching in common project locations with documentation patterns
                const projectPaths = [
                  '/home/moebius/dev/projects/moebius',
                  '/home/moebius/dev/projects',
                  '/home/moebius/Documents',
                ];
                
                for (const projectPath of projectPaths) {
                  try {
                    onStatusUpdate?.(`Searching in ${projectPath}...`);
                    const docResults = await backendApi.searchDocuments(
                      args.query.split(',')[0], // Use first keyword
                      'md,txt,pdf,doc,docx',
                      projectPath
                    );
                    
                    if (docResults.merged_results && docResults.merged_results.length > 0) {
                      const additionalFiles = convertFileSearchResults(docResults, args.file_types);
                      // Merge results, avoiding duplicates
                      const existingPaths = new Set(convertedResults.files.map((f: any) => f.path));
                      for (const file of additionalFiles.files) {
                        if (!existingPaths.has(file.path)) {
                          convertedResults.files.push(file);
                          existingPaths.add(file.path);
                        }
                      }
                    }
                  } catch (e) {
                    console.warn(`Failed to search in ${projectPath}:`, e);
                  }
                }
              }
            }
            
            // Always use AI to score and rank results for relevance
            onStatusUpdate?.(`Scoring ${convertedResults.files.length} results for relevance...`);
            console.log('🤖 Using AI to score', convertedResults.files.length, 'results for relevance');
            
            const scoringResponse = await ai.models.generateContent({
              model: modelName,
              contents: [
                { role: 'user', parts: [{ text: `Score these search results for relevance to: "${message}"

Results to score (index, filename, path):
${convertedResults.files.slice(0, 50).map((f: any, i: number) => 
  `${i}. "${f.name}" - ${f.path}`
).join('\n')}

Return a JSON object with:
- "scores": array of {index, score, reason} where score is 0-100 (100 = perfect match)
- "top_results": array of indices for the most relevant results (max 10)

Scoring rules for "${message}":
- 100: Perfect match (e.g., file named "pitch deck" or "investor presentation")
- 80-99: Strong match (contains key terms like "deck", "pitch", "presentation" in filename)
- 50-79: Possible match (right file type, might be relevant)
- 20-49: Weak match (right extension but unlikely to be what user wants)
- 0-19: Not relevant (Instagram posts, manuals, unrelated documents)

Be strict! For "pitch deck", only files with "deck", "pitch", "presentation", "investor" in the name should score high.` }] }
              ],
              config: {
                responseMimeType: 'application/json',
              },
            });

            let filteredFiles = convertedResults.files;
            let filterReason = 'AI relevance scoring';
            const searchMode = 'hybrid';
            
            try {
              onStatusUpdate?.(`Analyzing results...`);
              const scoringResult = JSON.parse(scoringResponse?.text || '{}');
              const scores = scoringResult.scores || [];
              const topResults = scoringResult.top_results || [];
              
              console.log('📊 AI scoring results:', { 
                totalScored: scores.length, 
                topResults: topResults.length,
                scores: scores.slice(0, 5)
              });
              
              // Apply scores to files
              const scoredFiles = convertedResults.files.map((f: any, i: number) => {
                const scoreInfo = scores.find((s: any) => s.index === i);
                return {
                  ...f,
                  relevanceScore: scoreInfo?.score || 0,
                  scoreReason: scoreInfo?.reason || 'Not scored'
                };
              });
              
              // Filter to only show relevant results (score >= 50) or top results
              const relevantIndices = new Set(topResults);
              filteredFiles = scoredFiles
                .filter((f: any, i: number) => f.relevanceScore >= 50 || relevantIndices.has(i))
                .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
                .slice(0, 15); // Max 15 results
              
              filterReason = `AI scored ${scores.length} files, showing ${filteredFiles.length} relevant results`;
              
            } catch (parseError) {
              console.warn('Failed to parse AI scoring, using fallback filtering');
              // Fallback: simple keyword matching
              const keywords = args.query.toLowerCase().split(',').map((k: string) => k.trim());
              filteredFiles = convertedResults.files
                .filter((f: any) => {
                  const nameLower = f.name.toLowerCase();
                  return keywords.some((kw: string) => nameLower.includes(kw));
                })
                .slice(0, 15);
              filterReason = 'Keyword filtering (AI scoring failed)';
            }
            
            result = { 
              type: 'file_list', 
              data: filteredFiles,
              searchInfo: {
                ...convertedResults.searchInfo,
                totalResults: filteredFiles.length,
                originalResults: convertedResults.files.length,
                filterReason,
                searchMode
              }
            };
            
            console.log('✅ File search completed:', {
              query: args.query,
              searchPath: args.search_path || 'default',
              originalResults: convertedResults.files.length,
              filteredResults: filteredFiles.length,
              searchMode,
              time: convertedResults.searchInfo.executionTime + 'ms'
            });

            // Log the activity with search metadata
            activityLogger.log(
              'File Search',
              args.query + (args.search_path ? ` in ${args.search_path}` : ''),
              `Found ${filteredFiles.length} relevant files (${convertedResults.files.length} total)`,
              'success',
              { executionTime: convertedResults.searchInfo.executionTime },
              {
                query: args.query,
                fileTypes: args.file_types,
                searchPath: args.search_path,
                searchMode,
                executionTime: convertedResults.searchInfo.executionTime,
                originalResults: convertedResults.files.length,
                filteredResults: filteredFiles.length,
                filterReason,
                results: convertedResults.files.slice(0, 50).map((f: any, i: number) => ({
                  path: f.path,
                  name: f.name,
                  score: f.score || 0,
                  included: filteredFiles.some((ff: any) => ff.path === f.path)
                }))
              }
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
            
            onStatusUpdate?.(`Searching content for "${args.query}"...`);
            
            const searchOptions: any = {};
            if (args.file_types) searchOptions.file_types = args.file_types;
            if (args.case_sensitive) searchOptions.case_sensitive = args.case_sensitive;
            if (args.search_path) searchOptions.search_path = args.search_path;
            
            const backendResults = await backendApi.searchContent(args.query, searchOptions);
            const convertedResults = convertFileSearchResults(backendResults);
            
            onStatusUpdate?.(`Filtering ${convertedResults.files.length} results...`);
            
            // Ask AI to filter the results for content search too
            const filterResponse = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: [
                ...history,
                { role: 'user', parts: [{ text: message }] },
                { role: 'model', parts: [{ functionCall: fc }] },
                { role: 'user', parts: [{ functionResponse: { id: fc.id, name: fc.name, response: { 
                  results: convertedResults.files.map((f: any, i: number) => ({ 
                    index: i, 
                    path: f.path, 
                    name: f.name, 
                    snippet: f.snippet,
                    score: f.score 
                  })),
                  searchInfo: convertedResults.searchInfo
                } } }] }
              ],
              config: {
                systemInstruction: `You received content search results. Analyze each file and its snippet to determine which ones are ACTUALLY relevant to what the user asked for.

User asked: "${message}"
Search query used: "${args.query}"

FILTERING RULES:
- Include files where the content snippet is relevant to the user's question
- EXCLUDE: files where the match is incidental (e.g., variable names, imports, comments that aren't relevant)
- EXCLUDE: files in node_modules, .git, target directories unless specifically relevant
- If NO results are truly relevant, return an empty array

Call filterResults with the indices of relevant files (or empty array if none are relevant).`,
                tools: [{ functionDeclarations: [filterResultsFunction] }],
              },
            });

            const filterCalls = filterResponse?.functionCalls;
            let filteredFiles = convertedResults.files;
            let filterReason = '';
            
            if (filterCalls && filterCalls.length > 0 && filterCalls[0].name === 'filterResults') {
              const filterArgs = filterCalls[0].args as any;
              const relevantIndices = filterArgs.relevant_indices || [];
              filterReason = filterArgs.reason || '';
              
              console.log('🔍 AI filtered content results:', { relevantIndices, reason: filterReason });
              
              if (relevantIndices.length === 0) {
                filteredFiles = [];
              } else {
                filteredFiles = relevantIndices
                  .filter((i: number) => i >= 0 && i < convertedResults.files.length)
                  .map((i: number) => convertedResults.files[i]);
              }
            }
            
            result = { 
              type: 'file_list', 
              data: filteredFiles,
              searchInfo: {
                ...convertedResults.searchInfo,
                totalResults: filteredFiles.length,
                originalResults: convertedResults.files.length,
                filterReason
              }
            };
            
            console.log('✅ Content search completed:', {
              query: args.query,
              searchPath: args.search_path || 'default',
              originalResults: convertedResults.files.length,
              filteredResults: filteredFiles.length,
              time: convertedResults.searchInfo.executionTime + 'ms'
            });

            // Log the activity with search metadata
            activityLogger.log(
              'Content Search',
              args.query + (args.search_path ? ` in ${args.search_path}` : ''),
              `Found ${filteredFiles.length} relevant files (${convertedResults.files.length} total)`,
              'success',
              { executionTime: convertedResults.searchInfo.executionTime },
              {
                query: args.query,
                fileTypes: args.file_types,
                searchPath: args.search_path,
                searchMode: 'content',
                executionTime: convertedResults.searchInfo.executionTime,
                originalResults: convertedResults.files.length,
                filteredResults: filteredFiles.length,
                filterReason,
                results: convertedResults.files.slice(0, 50).map((f: any, i: number) => ({
                  path: f.path,
                  name: f.name,
                  score: f.score || 0,
                  included: filteredFiles.some((ff: any) => ff.path === f.path)
                }))
              }
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
              content: `I encountered an error while searching for "${(fc.args as any).query}" in file contents. Please try a different search term.`
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