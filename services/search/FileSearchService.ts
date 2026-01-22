
import { backendApi } from '../backendApi';
import { providerRegistry } from '../providerRegistry';
import { apiKeyService } from '../apiKeyService';
import { activityLogger } from '../activityLogger';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: string;
  name: string;
  path: string;
  size: string;
  category: string;
  safeToRemove: boolean;
  lastUsed: string;
  score: number;
  source: string;
  snippet?: string;
  fileType: string;
  relevanceScore?: number;
  scoreReason?: string;
}

export interface SearchResponse {
  type: 'file_list' | 'error';
  text?: string;
  data?: SearchResult[];
  searchInfo?: any;
  provider?: string;
  model?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategory(fileType: string, path: string): string {
  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('node_modules') || pathLower.includes('target') || pathLower.includes('.git')) return 'Dev';
  if (pathLower.includes('temp') || pathLower.includes('cache') || pathLower.includes('tmp')) return 'Temp';
  if (pathLower.includes('system') || pathLower.includes('log')) return 'System';
  if (pathLower.includes('document') || pathLower.includes('work')) return 'Work';
  if (pathLower.includes('picture') || pathLower.includes('photo') || pathLower.includes('image')) return 'Personal';
  
  switch (fileType?.toLowerCase()) {
    case 'rs': case 'js': case 'ts': case 'py': case 'java': case 'cpp': case 'c': return 'Dev';
    case 'pdf': case 'doc': case 'docx': case 'txt': case 'md': return 'Document';
    case 'jpg': case 'png': case 'gif': case 'svg': return 'Image';
    case 'mp3': case 'wav': case 'mp4': case 'avi': return 'Media';
    default: return 'Other';
  }
}

function convertFileSearchResults(backendResults: any, fileTypesFilter?: string) {
  const allowedExtensions = fileTypesFilter 
    ? fileTypesFilter.split(',').map(ext => ext.trim().toLowerCase())
    : null;

  let files = backendResults.merged_results?.map((result: any) => {
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

// ============================================================================
// AI Scoring Logic
// ============================================================================

async function scoreFilesWithAI(
  files: any[], 
  userMessage: string, 
  searchQuery: string,
  provider: string,
  apiKey: string,
  model: string,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  if (files.length === 0) return files;
  
  onStatusUpdate?.(`Scoring ${files.length} results for relevance...`);
  console.log('🤖 Using AI to score', files.length, 'results for relevance');
  
  const scoringPrompt = `Score these search results for relevance to: "${userMessage}"

Results to score (index, filename, path):
${files.slice(0, 50).map((f: any, i: number) => `${i}. "${f.name}" - ${f.path}`).join('\n')}

Return a JSON object with:
- "scores": array of {index, score, reason} where score is 0-100 (100 = perfect match)
- "top_results": array of indices for the most relevant results (max 15)

Scoring rules for "${searchQuery}":
- 100: Perfect match (exact filename match or highly relevant)
- 80-99: Strong match (contains key terms in filename)
- 50-79: Possible match (right file type, might be relevant)
- 20-49: Weak match (right extension but unlikely to be what user wants)
- 0-19: Not relevant (unrelated files, system files, etc.)`;

  try {
    // We use the provider registry to handle the raw chat call for scoring
    // This reuses the logic we extracted to ProviderRegistry
    const response = await providerRegistry.chat(
      provider,
      model,
      apiKey,
      scoringPrompt + (provider === 'anthropic' ? '\n\nRespond with valid JSON only.' : ''), // Hint for Anthropic
      [],
      "You are a file relevance scoring engine. Output JSON only.",
      undefined, // no tools
      undefined // no images
    );

    const text = response.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const scoringResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    if (scoringResult && scoringResult.scores) {
      const scores = scoringResult.scores || [];
      const topResults = scoringResult.top_results || [];
      
      const scoredFiles = files.map((f: any, i: number) => {
        const scoreInfo = scores.find((s: any) => s.index === i);
        return {
          ...f,
          relevanceScore: scoreInfo?.score || 0,
          scoreReason: scoreInfo?.reason || 'Not scored'
        };
      });
      
      const relevantIndices = new Set(topResults);
      return scoredFiles
        .filter((f: any, i: number) => f.relevanceScore >= 50 || relevantIndices.has(i))
        .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 15);
    }
  } catch (error) {
    console.warn('Failed to score files with AI, using fallback:', error);
  }
  
  // Fallback scoring
  const keywords = searchQuery.toLowerCase().split(',').map((k: string) => k.trim());
  return files
    .map((f: any) => {
      if (f.score !== undefined && f.score > 0) {
        return { ...f, relevanceScore: Math.round(f.score * 100), scoreReason: f.source ? `via ${f.source}` : 'Backend score' };
      }
      
      const nameLower = f.name.toLowerCase();
      const pathLower = f.path.toLowerCase();
      
      if (keywords.some((kw: string) => nameLower === kw || nameLower.startsWith(kw + '.'))) {
        return { ...f, relevanceScore: 95, scoreReason: 'Exact match' };
      }
      if (keywords.some((kw: string) => nameLower.includes(kw))) {
        return { ...f, relevanceScore: 85, scoreReason: 'Name match' };
      }
      if (keywords.some((kw: string) => pathLower.includes(kw))) {
        return { ...f, relevanceScore: 70, scoreReason: 'Path match' };
      }
      return { ...f, relevanceScore: 50, scoreReason: 'Keyword match' };
    })
    .filter((f: any) => f.relevanceScore >= 50)
    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15);
}

// ============================================================================
// Service Class
// ============================================================================

class FileSearchService {
  async findFile(
    args: any, 
    onStatusUpdate?: (status: string) => void,
    providerInfo?: { provider: string; apiKey: string; model: string; userMessage?: string },
    meta?: { chatId?: string; messageId?: string }
  ): Promise<SearchResponse> {
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
      
      let scoredFiles = convertedResults.files;
      let filterReason = 'No AI scoring';
      
      if (providerInfo && providerInfo.userMessage) {
        scoredFiles = await scoreFilesWithAI(
          convertedResults.files,
          providerInfo.userMessage,
          args.query,
          providerInfo.provider,
          providerInfo.apiKey,
          providerInfo.model,
          onStatusUpdate
        );
        filterReason = `AI scored ${convertedResults.files.length} files, showing ${scoredFiles.length} relevant results`;
      }
      
      activityLogger.log(
        'File Search',
        args.query + (args.search_path ? ` in ${args.search_path}` : ''),
        `Found ${scoredFiles.length} relevant files (${convertedResults.files.length} total)`,
        'success',
        { executionTime: convertedResults.searchInfo.executionTime },
        undefined,
        meta?.chatId,
        meta?.messageId
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
      activityLogger.log('File Search', args.query, 'Search failed', 'error', undefined, undefined, meta?.chatId, meta?.messageId);
      return {
        type: 'error',
        text: `File search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchContent(
    args: any, 
    onStatusUpdate?: (status: string) => void,
    meta?: { chatId?: string; messageId?: string }
  ): Promise<SearchResponse> {
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
        'success',
        undefined,
        undefined,
        meta?.chatId,
        meta?.messageId
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
}

export const fileSearchService = new FileSearchService();
