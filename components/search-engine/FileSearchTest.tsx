import React, { useState } from 'react';
import { Search, Loader2, CheckCircle, XCircle, ExternalLink, Folder, Copy, Check } from 'lucide-react';
import { backendApi } from '../../services/backendApi';

// Helper to open a file directly
const openFile = async (filePath: string): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/v1/files/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
  } catch {}
  return false;
};

// Helper to open parent folder and select the file
const openFolder = async (filePath: string): Promise<boolean> => {
  const normalizedPath = filePath.replace(/\//g, '\\');
  try {
    const response = await fetch('http://localhost:3001/api/v1/files/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normalizedPath }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
  } catch {}
  return false;
};

// File result item with action buttons
const FileResultItem: React.FC<{ file: any }> = ({ file }) => {
  const [copied, setCopied] = useState(false);

  const handleOpen = async () => {
    const success = await openFile(file.path);
    if (!success) {
      await navigator.clipboard.writeText(file.path);
      alert(`📋 Path copied!\n\n${file.path}\n\nBackend may not be running.`);
    }
  };

  const handleFolder = async () => {
    const success = await openFolder(file.path);
    if (!success) {
      await navigator.clipboard.writeText(file.path);
      alert(`📋 Path copied!\n\n${file.path}\n\nBackend may not be running.`);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium">{file.path}</div>
          <div className="text-sm text-gray-600">
            Score: {file.relevance_score?.toFixed(2) || 'N/A'} | 
            Engine: {file.source_engine} | 
            Type: {file.file_type}
          </div>
          {file.snippet && (
            <div className="text-xs text-gray-500 mt-1 italic">
              "{file.snippet}"
            </div>
          )}
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-2 border-t">
        <button
          onClick={handleOpen}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5 text-sm"
        >
          <ExternalLink size={14} />
          Open
        </button>
        <button
          onClick={handleFolder}
          className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5 text-sm"
        >
          <Folder size={14} />
          Folder
        </button>
        <button
          onClick={handleCopy}
          className={`flex-1 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-sm ${
            copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

interface FileSearchTestProps {
  onClose: () => void;
}

export const FileSearchTest: React.FC<FileSearchTestProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const checkBackend = async () => {
    try {
      await backendApi.health();
      setBackendStatus('connected');
    } catch (err) {
      setBackendStatus('error');
      setError('Backend not available. Make sure the Rust backend is running on port 3001.');
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const searchResults = await backendApi.aiFileSearch(query, {
        mode: 'auto',
        max_results: 10,
        include_indices: true
      });
      
      setResults(searchResults);
      console.log('🔍 File search results:', searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('❌ File search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionTest = async () => {
    try {
      const suggestion = await backendApi.getSearchSuggestions({
        prompt: "I need to find the main configuration file for this project",
        project_type: "web"
      });
      
      console.log('💡 AI Suggestion result:', suggestion);
      alert(`AI Suggestion: ${suggestion.should_suggest_file_search ? 'YES' : 'NO'}\nConfidence: ${suggestion.confidence}\nSuggested queries: ${suggestion.suggested_queries.join(', ')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestion test failed');
    }
  };

  React.useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">File Search Integration Test</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Backend Status */}
        <div className="mb-6 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">Backend Status:</span>
            {backendStatus === 'connected' && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle size={16} />
                <span>Connected</span>
              </div>
            )}
            {backendStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle size={16} />
                <span>Disconnected</span>
              </div>
            )}
            {backendStatus === 'unknown' && (
              <div className="flex items-center gap-1 text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                <span>Checking...</span>
              </div>
            )}
          </div>
          <button 
            onClick={checkBackend}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Recheck Backend
          </button>
        </div>

        {/* Search Test */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Test File Search</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query (e.g., 'main.rs', '*.js', 'config')"
              className="flex-1 px-3 py-2 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
          </div>
          
          <button
            onClick={handleSuggestionTest}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Test AI Suggestion Detection
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            <h3 className="font-semibold">Search Results</h3>
            
            {/* Search Info */}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Query:</strong> {results.query}</div>
                <div><strong>Mode:</strong> {results.mode}</div>
                <div><strong>Results:</strong> {results.merged_results?.length || 0}</div>
                <div><strong>Time:</strong> {results.total_execution_time_ms}ms</div>
              </div>
              
              {results.suggestions && results.suggestions.length > 0 && (
                <div className="mt-2">
                  <strong>AI Suggestions:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {results.suggestions.map((s: any, i: number) => (
                      <li key={i} className="text-xs">
                        "{s.suggestion}" - {s.reason} (confidence: {s.confidence})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* File Results */}
            {results.merged_results && results.merged_results.length > 0 ? (
              <div className="space-y-2">
                {results.merged_results.slice(0, 10).map((file: any, i: number) => (
                  <FileResultItem key={i} file={file} />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No files found for "{results.query}"
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">How to test:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Make sure the Rust backend is running: <code>cd backend && cargo run</code></li>
            <li>Try searching for files like "main", "*.rs", "config", etc.</li>
            <li>Check the browser console for detailed logs</li>
            <li>Test AI suggestion detection with the button above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
