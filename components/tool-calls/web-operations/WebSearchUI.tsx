/**
 * Web Search UI Plugin
 * 
 * Displays web search results with titles, URLs, snippets, and relevance scores.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, Calendar } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

// ============================================================================
// Types
// ============================================================================

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  relevance_score: number;
}

interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  total_results: number;
  search_time_ms: number;
}

// ============================================================================
// Components
// ============================================================================

const WebSearchResultCard: React.FC<{ result: WebSearchResult; index: number }> = ({ result, index }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 rounded-lg glass-subtle hover:glass-elevated transition-all group">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-full flex-shrink-0">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <a 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[12px] font-bold text-accent hover:underline flex items-center gap-1 group"
          >
            {result.title}
            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">
            {result.snippet}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-text-secondary">
            <span className="font-bold text-emerald-600">
              {result.relevance_score}% match
            </span>
            {result.published_date && (
              <span className="flex items-center gap-1">
                <Calendar size={9} />
                {result.published_date}
              </span>
            )}
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 hover:text-accent transition-colors ml-auto opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check size={9} /> : <Copy size={9} />}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchSummary: React.FC<{ 
  query: string; 
  totalResults: number; 
  searchTime: number;
}> = ({ query, totalResults, searchTime }) => {
  return (
    <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-text-primary">
          Query: <span className="font-mono text-accent">"{query}"</span>
        </span>
        <div className="flex items-center gap-3 text-text-secondary">
          <span>{totalResults} results</span>
          <span>•</span>
          <span>{searchTime}ms</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const WebSearchUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  const searchResults = useMemo<WebSearchResponse | null>(() => {
    if (!result?.output) return null;
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }, [result]);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Search Results' : 'Error'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Search results */}
      {result.success && searchResults ? (
        <div className="space-y-2">
          <SearchSummary 
            query={searchResults.query}
            totalResults={searchResults.total_results}
            searchTime={searchResults.search_time_ms}
          />
          
          {searchResults.results && searchResults.results.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {searchResults.results.map((result, i) => (
                <WebSearchResultCard key={i} result={result} index={i} />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-text-secondary text-[11px] glass-subtle rounded-lg">
              No results found for "{searchResults.query}"
            </div>
          )}
        </div>
      ) : (
        <pre className="text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] text-red-600 bg-red-500/10 border-red-500/20">
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

WebSearchUI.displayName = 'WebSearchUI';
