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
  score: u32;
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
};
