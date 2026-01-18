/**
 * Web Search UI Plugin
 * 
 * Displays web search results with embossed glassmorphic design.
 * Follows the Skhoot Embossed Style Guide for consistent theming.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, Calendar, ChevronRight, Globe, Grid3x3, List, ChevronDown } from 'lucide-react';
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

type ViewMode = 'grid' | 'list';

// ============================================================================
// Helper Functions
// ============================================================================

const openUrlInBrowser = async (url: string) => {
  console.log('[WebSearchUI] Attempting to open URL:', url);
  
  // Check if we're in Tauri environment (v1 or v2)
  const isTauri = typeof window !== 'undefined' && 
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  
  if (isTauri) {
    try {
      console.log('[WebSearchUI] Tauri detected, using shell plugin');
      const { open } = await import(/* @vite-ignore */ '@tauri-apps/plugin-shell');
      await open(url);
      console.log('[WebSearchUI] Successfully opened with Tauri shell');
      return;
    } catch (error) {
      console.error('[WebSearchUI] Tauri shell failed:', error);
    }
  } else {
    console.log('[WebSearchUI] Not in Tauri environment');
  }
  
  // Fallback to window.open
  console.log('[WebSearchUI] Using window.open fallback');
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    console.error('[WebSearchUI] Popup blocked! Please allow popups for this site.');
    // Try without the third parameter as a last resort
    window.open(url, '_blank');
  } else {
    console.log('[WebSearchUI] Successfully opened in new window');
  }
};

// ============================================================================
// Components
// ============================================================================

const GridResultCard: React.FC<{ result: WebSearchResult }> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const faviconUrl = useMemo(() => {
    try {
      const url = new URL(result.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch {
      return null;
    }
  }, [result.url]);

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
    await openUrlInBrowser(result.url);
  };

  return (
    <div 
      className="rounded-lg glass-subtle p-2 cursor-pointer transition-all duration-200 flex flex-col h-full"
      onClick={() => setExpanded(!expanded)}
      style={{
        boxShadow: expanded 
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' 
          : '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
      }}
    >
      <div className="flex items-start gap-2">
        {/* Favicon or page image */}
        <div 
          className="flex-shrink-0 w-5 h-5 rounded overflow-hidden mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenUrl(e);
          }}
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
            <div className="w-full h-full glass-subtle flex items-center justify-center">
              <img 
                src={faviconUrl} 
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={() => setFaviconError(true)}
              />
            </div>
          ) : (
            <div className="w-full h-full glass-subtle flex items-center justify-center">
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
          onClick={(e) => {
            e.stopPropagation();
            handleOpenUrl(e);
          }}
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
        <div className="flex flex-col flex-grow">
          <div className="pl-7 pr-1 pt-3 pb-3 flex-grow">
            <p className="text-[10px] text-text-secondary leading-relaxed break-words">
              {result.snippet}
            </p>
          </div>
          
          <div className="pl-7 pr-1 pt-2 space-y-1.5 border-t border-dashed border-glass-border">
            <a 
              href={result.url}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenUrl(e);
              }}
              className="flex items-center gap-1 text-[9px] text-accent hover:underline min-w-0"
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
        </div>
      )}
    </div>
  );
};

const ListResultCard: React.FC<{ result: WebSearchResult; isLast: boolean }> = ({ result, isLast }) => {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const faviconUrl = useMemo(() => {
    try {
      const url = new URL(result.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch {
      return null;
    }
  }, [result.url]);

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
    await openUrlInBrowser(result.url);
  };

  return (
    <div 
      className={`glass-subtle rounded-lg p-2 cursor-pointer transition-all duration-200 ${!isLast ? 'mb-2' : ''}`}
      onClick={() => setExpanded(!expanded)}
      style={{
        boxShadow: expanded 
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' 
          : '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
      }}
    >
      <div className="flex items-start gap-2">
        {/* Favicon or page image */}
        <div 
          className="flex-shrink-0 w-5 h-5 rounded overflow-hidden mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenUrl(e);
          }}
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
            <div className="w-full h-full glass-subtle flex items-center justify-center">
              <img 
                src={faviconUrl} 
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={() => setFaviconError(true)}
              />
            </div>
          ) : (
            <div className="w-full h-full glass-subtle flex items-center justify-center">
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
          onClick={(e) => {
            e.stopPropagation();
            handleOpenUrl(e);
          }}
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
        <>
          <div className="pl-7 pr-1 pt-3 pb-3">
            <p className="text-[10px] text-text-secondary leading-relaxed break-words">
              {result.snippet}
            </p>
          </div>
          
          <div className="pl-7 pr-1 pt-2 space-y-1.5 border-t border-dashed border-glass-border">
            <a 
              href={result.url}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenUrl(e);
              }}
              className="flex items-center gap-1 text-[9px] text-accent hover:underline min-w-0"
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
        </>
      )}
    </div>
  );
};

const SearchHeader: React.FC<{ 
  query: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}> = ({ query, viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-glass-border">
      <span className="text-[9px] font-medium text-text-secondary truncate max-w-[180px]">
        "{query}"
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewModeChange('grid')}
          className="p-1 rounded transition-all duration-200"
          style={{
            boxShadow: viewMode === 'grid' 
              ? 'inset 0 1px 2px rgba(0, 0, 0, 0.15)'
              : '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
          }}
          title="Grid view"
        >
          <Grid3x3 size={10} className={viewMode === 'grid' ? 'text-accent' : 'text-text-secondary'} />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className="p-1 rounded transition-all duration-200"
          style={{
            boxShadow: viewMode === 'list' 
              ? 'inset 0 1px 2px rgba(0, 0, 0, 0.15)'
              : '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
          }}
          title="List view"
        >
          <List size={10} className={viewMode === 'list' ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const WebSearchUI = memo<ToolCallUIProps>(({ 
  result,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAll, setShowAll] = useState(false);
  const [visibleRows, setVisibleRows] = useState(1); // Track number of visible rows

  const searchResults = useMemo<WebSearchResponse | null>(() => {
    if (!result?.output) return null;
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }, [result]);

  // Calculate items per row (estimate based on min card width)
  const itemsPerRow = 4; // Approximate for 160px min width cards

  const displayedResults = useMemo(() => {
    if (!searchResults?.results) return [];
    if (viewMode === 'list' || showAll) return searchResults.results;
    // Show results based on number of visible rows
    return searchResults.results.slice(0, visibleRows * itemsPerRow);
  }, [searchResults, viewMode, showAll, visibleRows]);

  const hasMore = searchResults && searchResults.results.length > (visibleRows * itemsPerRow) && viewMode === 'grid' && !showAll;
  const remainingCount = searchResults ? searchResults.results.length - (visibleRows * itemsPerRow) : 0;

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewMore = () => {
    if (remainingCount <= itemsPerRow) {
      // If remaining items fit in one row, show all
      setShowAll(true);
    } else {
      // Otherwise, add one more row
      setVisibleRows(prev => prev + 1);
    }
  };

  if (!result) {
    return null;
  }

  return (
    <div className="w-full max-w-[95%]">
      {/* Search results */}
      {result.success && searchResults ? (
        <div className="rounded-lg border border-dashed border-glass-border p-3 backdrop-blur-[8px] backdrop-saturate-[1.2]">
          <SearchHeader 
            query={searchResults.query} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          
          {searchResults.results && searchResults.results.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-fr">
                    {displayedResults.map((searchResult, i) => (
                      <GridResultCard key={i} result={searchResult} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-hidden mt-2">
                  {displayedResults.map((searchResult, i) => (
                    <ListResultCard 
                      key={i} 
                      result={searchResult} 
                      isLast={i === displayedResults.length - 1}
                    />
                  ))}
                </div>
              )}

              {/* View More button */}
              {hasMore && (
                <div className="mt-3 pt-2 border-t border-dashed border-glass-border">
                  <button
                    onClick={handleViewMore}
                    className="w-full flex items-center justify-center gap-1 text-[9px] text-text-secondary hover:text-text-primary transition-all duration-200 rounded px-2 py-1.5"
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
                    <ChevronDown size={10} />
                    View {remainingCount} more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-3 text-center text-text-secondary text-[10px]">
              No results found
            </div>
          )}

          {/* Footer with stats and copy button */}
          <div className="pt-2 mt-2 border-t border-dashed border-glass-border flex items-center justify-between">
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
              {copied ? 'Copied' : 'Copy all'}
            </button>
            
            <div className="flex items-center gap-1.5 text-[9px] text-text-secondary">
              <span>{searchResults.total_results} found</span>
              <span className="text-text-secondary/50">•</span>
              <span>{searchResults.search_time_ms}ms</span>
            </div>
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
