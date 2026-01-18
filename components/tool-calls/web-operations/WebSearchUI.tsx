/**
 * Web Search UI Plugin
 * 
 * Displays web search results with embossed glassmorphic design.
 * Follows the Skhoot Embossed Style Guide for consistent theming.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, Calendar, ChevronRight, Globe } from 'lucide-react';
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
  image_url?: string;
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

const WebSearchResultCard: React.FC<{ result: WebSearchResult; isLast: boolean }> = ({ result, isLast }) => {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Get favicon from Google's service
  const faviconUrl = useMemo(() => {
    try {
      const url = new URL(result.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch {
      return null;
    }
  }, [result.url]);

  // Extract hostname for display
  const hostname = useMemo(() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [result.url]);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUrl = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { open } = await import(/* @vite-ignore */ '@tauri-apps/plugin-shell');
      await open(result.url);
    } catch (error) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`${!isLast ? 'border-b border-dashed border-glass-border' : ''}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="py-2 flex items-start gap-2 cursor-pointer hover:bg-glass-bg/30 transition-all duration-200 rounded-sm px-1 -mx-1"
        style={{
          boxShadow: expanded 
            ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' 
            : 'none'
        }}
      >
        {/* Favicon or page image */}
        <div 
          className="flex-shrink-0 w-5 h-5 rounded overflow-hidden mt-0.5 cursor-pointer"
          onClick={handleOpenUrl}
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
          }}
        >
          {result.image_url && !imageError ? (
            <img 
              src={result.image_url} 
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : faviconUrl && !faviconError ? (
            <div className="w-full h-full bg-glass-bg/50 flex items-center justify-center">
              <img 
                src={faviconUrl} 
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={() => setFaviconError(true)}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-glass-bg/50 flex items-center justify-center">
              <Globe size={10} className="text-text-secondary" />
            </div>
          )}
        </div>

        {/* Title and snippet */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-text-primary leading-snug">
            {result.title}
          </p>
          {!expanded && (
            <p className="text-[9px] text-text-secondary line-clamp-1 mt-0.5">
              {result.snippet}
            </p>
          )}
        </div>

        {/* Open button */}
        <button
          onClick={handleOpenUrl}
          className="flex-shrink-0 p-1 rounded transition-all duration-200 mt-0.5"
          style={{
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.15)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)';
          }}
          title="Open in browser"
        >
          <ChevronRight size={12} className="text-text-secondary" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="pl-7 pr-1 pb-2 space-y-1.5 overflow-hidden">
          <p className="text-[10px] text-text-secondary leading-relaxed break-words">
            {result.snippet}
          </p>
          <a 
            href={result.url}
            onClick={handleOpenUrl}
            className="flex items-center gap-1 text-[9px] text-accent hover:underline min-w-0 cursor-pointer"
          >
            <Globe size={9} className="flex-shrink-0" />
            <span className="truncate">{hostname}</span>
          </a>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px]">
            <span className="text-emerald-600 font-medium">
              {Math.round(result.relevance_score * 100)}%
            </span>
            {result.published_date && (
              <span className="text-text-secondary flex items-center gap-1">
                <Calendar size={9} />
                {result.published_date}
              </span>
            )}
            <button
              onClick={handleOpenUrl}
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ExternalLink size={9} />
              Open
            </button>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              {copied ? <Check size={9} /> : <Copy size={9} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SearchHeader: React.FC<{ 
  query: string;
}> = ({ query }) => {
  return (
    <div className="flex items-center gap-2 text-[9px] text-text-secondary pb-1.5 border-b border-dashed border-glass-border">
      <span className="font-medium truncate max-w-[180px]">"{query}"</span>
    </div>
  );
};

const SearchFooter: React.FC<{ 
  totalResults: number; 
  searchTime: number;
}> = ({ totalResults, searchTime }) => {
  return (
    <div className="pt-2 mt-2 border-t border-dashed border-glass-border flex items-center justify-end gap-1.5 text-[9px] text-text-secondary">
      <span>{totalResults} found</span>
      <span className="text-text-secondary/50">•</span>
      <span>{searchTime}ms</span>
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
    <div className="max-w-[320px]">
      {/* Search results */}
      {result.success && searchResults ? (
        <div 
          className="rounded-lg border border-dashed border-glass-border p-2 backdrop-blur-[8px]"
          style={{
            background: 'var(--glass-bg)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <SearchHeader query={searchResults.query} />
          
          {searchResults.results && searchResults.results.length > 0 ? (
            <div className="overflow-x-hidden">
              {searchResults.results.map((searchResult, i) => (
                <WebSearchResultCard 
                  key={i} 
                  result={searchResult} 
                  isLast={i === searchResults.results.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-text-secondary text-[10px]">
              No results found
            </div>
          )}

          <SearchFooter 
            totalResults={searchResults.total_results}
            searchTime={searchResults.search_time_ms}
          />

          <div className="pt-2 mt-2 border-t border-dashed border-glass-border">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[9px] text-text-secondary hover:text-text-primary transition-all duration-200 rounded px-1.5 py-1"
              style={{
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.15)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)';
              }}
            >
              {copied ? <Check size={9} /> : <Copy size={9} />}
              {copied ? 'Copied results' : 'Copy all results'}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="rounded-lg border border-dashed border-red-500/30 p-2"
          style={{
            background: 'rgba(239, 68, 68, 0.05)'
          }}
        >
          <pre className="text-[10px] font-mono overflow-x-auto max-h-[100px] text-red-600">
            {result.output || result.error || 'No output'}
          </pre>
        </div>
      )}
    </div>
  );
});

WebSearchUI.displayName = 'WebSearchUI';
