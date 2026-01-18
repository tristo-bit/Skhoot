const BACKEND_URL = 'http://localhost:3001';

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  indexer: string;
}

export interface ProviderInfo {
  provider: string;
  models: string[];
}

export interface SearchResult {
  file: {
    id: string;
    path: string;
    name: string;
    size: number;
    modified_at: string;
    mime_type: string;
  };
  score: number;
  snippet: string;
  match_type: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
  search_time_ms: number;
}

// New file search types matching backend
export interface FileSearchMatch {
  score: number;
  path: string;
  relative_path: string;
  file_name: string;
  file_size?: number;
  modified?: string;
  file_type: string;
  indices?: number[];
}

export interface FileSearchResults {
  search_id: string;
  query: string;
  mode: string;
  file_results?: {
    matches: FileSearchMatch[];
    total_matches: number;
    search_time_ms: number;
    query: string;
    truncated: boolean;
  };
  cli_results?: {
    files: Array<{
      path: string;
      line_number?: number;
      content?: string;
      match_type: string;
    }>;
    command_used: string;
    execution_time_ms: number;
    total_results: number;
  };
  merged_results: Array<{
    path: string;
    relevance_score: number;
    source_engine: string;
    file_type: string;
    size?: number;
    modified?: string;
    snippet?: string;
    line_number?: number;
  }>;
  total_execution_time_ms: number;
  suggestions: Array<{
    suggestion: string;
    reason: string;
    confidence: number;
  }>;
}

export interface SearchSuggestionRequest {
  prompt: string;
  current_file?: string;
  recent_files?: string[];
  project_type?: string;
}

export interface SearchSuggestionResponse {
  should_suggest_file_search: boolean;
  suggested_queries: string[];
  search_intent: string;
  confidence: number;
}

// ============================================================================
// Disk Management Types
// ============================================================================

export interface DiskInfoResponse {
  disks: DiskInfoItem[];
}

export interface DiskInfoItem {
  id: string;
  name: string;
  mount_point: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percentage: number;
  disk_type: string; // "internal", "external", "network"
}

export interface DiskAnalysisResponse {
  total_size: number;
  total_size_formatted: string;
  file_count: number;
  dir_count: number;
  top_consumers: SpaceConsumer[];
  analysis_time_ms: number;
}

export interface SpaceConsumer {
  path: string;
  name: string;
  size: number;
  size_formatted: string;
  percentage: number;
  is_directory: boolean;
}

export interface CleanupSuggestionsResponse {
  suggestions: CleanupSuggestion[];
  total_reclaimable: number;
  total_reclaimable_formatted: string;
}

export interface CleanupSuggestion {
  id: string;
  name: string;
  path: string;
  size: number;
  size_formatted: string;
  category: string;
  safety_level: string; // "safe", "review", "risky"
  description: string;
  consequence: string;
  last_accessed?: string;
}

export interface StorageCategoriesResponse {
  categories: StorageCategory[];
  total_size: number;
  total_size_formatted: string;
}

export interface StorageCategory {
  name: string;
  size: number;
  size_formatted: string;
  file_count: number;
  percentage: number;
  color: string;
}

// ============================================================================
// Web Search Types
// ============================================================================

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  relevance_score: number;
  image_url?: string;
}

export interface ImageResult {
  url: string;
  thumbnail_url?: string;
  title?: string;
  source_url?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  total_results: number;
  search_time_ms: number;
  images?: ImageResult[];
}

export const backendApi = {
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.statusText}`);
    }
    return response.json();
  },

  async ping(): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/v1/ping`);
    if (!response.ok) {
      throw new Error(`Backend ping failed: ${response.statusText}`);
    }
    return response.text();
  },

  async detectProvider(apiKey: string): Promise<ProviderInfo> {
    const response = await fetch(`${BACKEND_URL}/api/v1/ai/detect-provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    
    if (!response.ok) {
      throw new Error(`Provider detection failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async searchFiles(query: string, limit?: number): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search?${params}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async startIndexing(): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/index/start`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to start indexing: ${response.statusText}`);
    }
  },

  // New AI-optimized file search methods
  async aiFileSearch(query: string, options?: {
    mode?: 'rust' | 'cli' | 'hybrid' | 'auto';
    max_results?: number;
    include_indices?: boolean;
    file_types?: string;
    exclude_dirs?: string;
    search_path?: string;  // Custom search path (defaults to user home)
  }): Promise<FileSearchResults> {
    const params = new URLSearchParams({ q: query });
    
    if (options?.mode) params.append('mode', options.mode);
    if (options?.max_results) params.append('max_results', options.max_results.toString());
    if (options?.include_indices) params.append('include_indices', 'true');
    if (options?.file_types) params.append('file_types', options.file_types);
    if (options?.exclude_dirs) params.append('exclude_dirs', options.exclude_dirs);
    if (options?.search_path) params.append('search_path', options.search_path);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/files?${params}`);
    if (!response.ok) {
      throw new Error(`AI file search failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async openFileLocation(path: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BACKEND_URL}/api/v1/files/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to open file location: ${response.statusText}`);
    }
    
    return response.json();
  },

  async searchContent(query: string, options?: {
    context_lines?: number;
    case_sensitive?: boolean;
    regex?: boolean;
    file_types?: string;
    search_path?: string;  // Custom search path (defaults to user home)
  }): Promise<FileSearchResults> {
    const params = new URLSearchParams({ q: query });
    
    if (options?.context_lines) params.append('context_lines', options.context_lines.toString());
    if (options?.case_sensitive) params.append('case_sensitive', 'true');
    if (options?.regex) params.append('regex', 'true');
    if (options?.file_types) params.append('file_types', options.file_types);
    if (options?.search_path) params.append('search_path', options.search_path);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/content?${params}`);
    if (!response.ok) {
      throw new Error(`Content search failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Document search using CLI tools (like Codex CLI)
  // Searches for documents by filename patterns and extensions
  async searchDocuments(keywords: string, extensions: string, searchPath?: string): Promise<FileSearchResults> {
    const params = new URLSearchParams({ 
      keywords,
      extensions
    });
    
    if (searchPath) params.append('search_path', searchPath);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/documents?${params}`);
    if (!response.ok) {
      throw new Error(`Document search failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getSearchSuggestions(request: SearchSuggestionRequest): Promise<SearchSuggestionResponse> {
    const response = await fetch(`${BACKEND_URL}/api/v1/search/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Search suggestions failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getSearchHistory(limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/history?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get search history: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getActiveSearches(): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/v1/search/active`);
    if (!response.ok) {
      throw new Error(`Failed to get active searches: ${response.statusText}`);
    }
    
    return response.json();
  },

  async cancelSearch(searchId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/search/${searchId}/cancel`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel search: ${response.statusText}`);
    }
  },

  // ============================================================================
  // Disk Management APIs
  // ============================================================================

  /**
   * Get system disk information (all mounted drives)
   */
  async getDiskInfo(): Promise<DiskInfoResponse> {
    const response = await fetch(`${BACKEND_URL}/api/v1/disk/info`);
    if (!response.ok) {
      throw new Error(`Failed to get disk info: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Analyze disk usage for a path
   */
  async analyzeDisk(options?: {
    path?: string;
    max_depth?: number;
    top_n?: number;
  }): Promise<DiskAnalysisResponse> {
    const params = new URLSearchParams();
    if (options?.path) params.append('path', options.path);
    if (options?.max_depth) params.append('max_depth', options.max_depth.toString());
    if (options?.top_n) params.append('top_n', options.top_n.toString());
    
    const response = await fetch(`${BACKEND_URL}/api/v1/disk/analyze?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to analyze disk: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get cleanup suggestions
   */
  async getCleanupSuggestions(): Promise<CleanupSuggestionsResponse> {
    const response = await fetch(`${BACKEND_URL}/api/v1/disk/cleanup-suggestions`);
    if (!response.ok) {
      throw new Error(`Failed to get cleanup suggestions: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get storage breakdown by category
   */
  async getStorageCategories(options?: {
    path?: string;
    max_depth?: number;
  }): Promise<StorageCategoriesResponse> {
    const params = new URLSearchParams();
    if (options?.path) params.append('path', options.path);
    if (options?.max_depth) params.append('max_depth', options.max_depth.toString());
    
    const response = await fetch(`${BACKEND_URL}/api/v1/disk/categories?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get storage categories: ${response.statusText}`);
    }
    return response.json();
  },

  // ============================================================================
  // File Operations APIs
  // ============================================================================

  /**
   * Read file content
   */
  async readFile(path: string, startLine?: number, endLine?: number): Promise<string> {
    const params = new URLSearchParams({ path });
    if (startLine) params.append('start_line', startLine.toString());
    if (endLine) params.append('end_line', endLine.toString());
    
    const response = await fetch(`${BACKEND_URL}/api/v1/files/read?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    const data = await response.json();
    return data.content || '';
  },

  /**
   * Write file content
   */
  async writeFile(path: string, content: string, append: boolean = false): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, append }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
  },

  /**
   * List directory contents
   */
  async listDirectory(path: string, depth?: number, includeHidden?: boolean): Promise<any> {
    const params = new URLSearchParams({ path });
    if (depth) params.append('depth', depth.toString());
    if (includeHidden) params.append('include_hidden', 'true');
    
    const response = await fetch(`${BACKEND_URL}/api/v1/files/list?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Execute shell command
   */
  async executeShellCommand(command: string, workdir?: string, timeoutMs?: number): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/v1/shell/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        command, 
        workdir: workdir || '.',
        timeout_ms: timeoutMs || 30000 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute shell command: ${response.statusText}`);
    }
    return response.json();
  },

  // ============================================================================
  // Agent Execution APIs
  // ============================================================================

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string, 
    status: 'running' | 'completed' | 'failed' | 'cancelled',
    error?: string,
    messages?: Array<{
      id: string;
      agent_id: string;
      content: string;
      timestamp: number;
      type: string;
    }>
  ): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/v1/executions/${executionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, error, messages }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update execution status: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/v1/executions/${executionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get execution: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * List all executions for an agent
   */
  async listAgentExecutions(agentId: string): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/${agentId}/executions`);
    if (!response.ok) {
      throw new Error(`Failed to list agent executions: ${response.statusText}`);
    }
    return response.json();
  },

  // ============================================================================
  // Web Search API
  // ============================================================================

  /**
   * Search the web for information
   */
  async webSearch(
    query: string, 
    numResults?: number, 
    searchType?: 'general' | 'news' | 'docs'
  ): Promise<WebSearchResponse> {
    const params = new URLSearchParams({ 
      q: query,
      num_results: (numResults || 5).toString(),
      search_type: searchType || 'general'
    });
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/web?${params}`);
    if (!response.ok) {
      throw new Error(`Web search failed: ${response.statusText}`);
    }
    
    return response.json();
  },
};
