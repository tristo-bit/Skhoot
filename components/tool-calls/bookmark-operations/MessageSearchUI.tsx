/**
 * Message Search UI Plugin
 * 
 * Displays bookmark search results with embossed glassmorphic design.
 * Follows the Skhoot Embossed Style Guide for consistent theming.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, MessageSquare, Calendar, Tag, StickyNote, User, Bot, ChevronDown } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

// ============================================================================
// Types
// ============================================================================

interface BookmarkResult {
  id: string;
  message_id: string;
  session_id: string | null;
  content: string;
  role: string;
  created_at: string;
  tags: string | null;
  notes: string | null;
}

interface MessageSearchResponse {
  query: string;
  results: BookmarkResult[];
  total_results: number;
}

// ============================================================================
// Components
// ============================================================================

const BookmarkResultCard: React.FC<{ result: BookmarkResult; isLast: boolean }> = ({ result, isLast }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const tags = result.tags ? result.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

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
        {/* Role Icon */}
        <div 
          className="flex-shrink-0 w-5 h-5 rounded overflow-hidden mt-0.5 flex items-center justify-center"
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
          }}
        >
          {result.role === 'user' ? (
            <User size={12} className="text-blue-400" />
          ) : (
            <Bot size={12} className="text-purple-400" />
          )}
        </div>

        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase">
              {result.role}
            </span>
            <span className="text-[9px] text-text-secondary flex items-center gap-1">
              <Calendar size={8} />
              {formatDate(result.created_at)}
            </span>
          </div>
          <p className={`text-[11px] font-medium text-text-primary leading-snug ${!expanded ? 'line-clamp-2' : ''}`}>
            {result.content}
          </p>
        </div>

        {/* Expand Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex-shrink-0 p-1 rounded transition-all duration-200 mt-0.5"
          style={{
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
          }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown 
            size={12} 
            className={`text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <>
          {/* Tags */}
          {tags.length > 0 && (
            <div className="pl-7 pr-1 pt-2 flex items-center gap-1 flex-wrap">
              <Tag size={9} className="text-text-secondary" />
              {tags.map((tag, i) => (
                <span 
                  key={i}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="pl-7 pr-1 pt-2 flex items-start gap-1">
              <StickyNote size={9} className="text-text-secondary mt-0.5" />
              <p className="text-[9px] text-text-secondary leading-relaxed">
                {result.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pl-7 pr-1 pt-2 border-t border-dashed border-glass-border mt-2">
            <div className="flex items-center gap-2 text-[9px] text-text-secondary">
              <span>ID: {result.message_id.slice(0, 8)}...</span>
              {result.session_id && (
                <>
                  <span>•</span>
                  <span>Session: {result.session_id.slice(0, 8)}...</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SearchHeader: React.FC<{ query: string; totalResults: number }> = ({ query, totalResults }) => {
  return (
    <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-glass-border">
      <span className="text-[9px] font-medium text-text-secondary truncate max-w-[180px]">
        "{query}"
      </span>
      <span className="text-[9px] text-text-secondary">
        {totalResults} {totalResults === 1 ? 'result' : 'results'}
      </span>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const MessageSearchUI = memo<ToolCallUIProps>(({ result }) => {
  const [copied, setCopied] = useState(false);

  const searchResults = useMemo<MessageSearchResponse | null>(() => {
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
    <div className="w-full max-w-[95%]">
      {/* Search results */}
      {result.success && searchResults ? (
        <div className="rounded-lg border border-dashed border-glass-border p-3 backdrop-blur-[8px] backdrop-saturate-[1.2]">
          <SearchHeader 
            query={searchResults.query} 
            totalResults={searchResults.total_results}
          />
          
          {searchResults.results && searchResults.results.length > 0 ? (
            <div className="overflow-x-hidden mt-2">
              {searchResults.results.map((searchResult, i) => (
                <BookmarkResultCard 
                  key={searchResult.id} 
                  result={searchResult} 
                  isLast={i === searchResults.results.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-text-secondary text-[10px]">
              No bookmarks found
            </div>
          )}

          {/* Footer with copy button */}
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
              <MessageSquare size={9} />
              <span>{searchResults.total_results} bookmarked messages</span>
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

MessageSearchUI.displayName = 'MessageSearchUI';
