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
};
