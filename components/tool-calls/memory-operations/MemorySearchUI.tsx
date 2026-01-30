/**
 * MemorySearchUI - Visual display for memory_search tool results
 * Uses the same design as the Memories panel for consistency
 */
import { memo, useState } from 'react';
import { Brain, ChevronRight, ChevronDown, FolderKanban, Settings, FileText, Code, Database, Globe, Lightbulb } from 'lucide-react';
import type { ToolCallUIProps } from '../registry/types';

interface Memory {
  id: string;
  content: string;
  role: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
  metadata: {
    importance?: string;
    category?: string;
    tags?: string[];
  };
}

interface MemorySearchResult {
  query: string;
  results: Memory[];
}

const getCategoryIcon = (category?: string) => {
  const cat = category?.toUpperCase();
  
  switch (cat) {
    case 'PROJECT':
      return <FolderKanban size={16} className="text-blue-400" />;
    case 'PREFERENCES':
      return <Settings size={16} className="text-purple-400" />;
    case 'OTHER':
      return <FileText size={16} className="text-green-400" />;
    case 'CODE':
      return <Code size={16} className="text-cyan-400" />;
    case 'DATABASE':
      return <Database size={16} className="text-orange-400" />;
    case 'WEB':
      return <Globe size={16} className="text-pink-400" />;
    case 'IDEA':
      return <Lightbulb size={16} className="text-yellow-400" />;
    case 'IMPORTANT_INFO':
      return <Brain size={16} className="text-indigo-400" />;
    default:
      return <Brain size={16} className="text-indigo-400" />;
  }
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const truncateText = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text;
  // Try to find first sentence end
  const firstSentenceEnd = text.search(/[.!?]\s/);
  if (firstSentenceEnd > 0 && firstSentenceEnd <= maxLength) {
    return text.substring(0, firstSentenceEnd + 1);
  }
  // Otherwise truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
};

interface MemoryCardProps {
  memory: Memory;
}

const MemoryCard = memo<MemoryCardProps>(({ memory }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg glass-subtle p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 relative ${
        expanded ? 'col-span-full' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
      style={{
        minHeight: expanded ? 'auto' : '110px',
        boxShadow: expanded
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
          : '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
      }}
    >
      {/* Chevron Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="absolute right-3 p-1 rounded transition-all duration-200 hover:bg-white/10 flex items-center"
        style={{ top: '19px' }}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-text-secondary" />
        ) : (
          <ChevronRight size={14} className="text-text-secondary" />
        )}
      </button>

      {/* Collapsed View */}
      {!expanded ? (
        <div className="flex items-start gap-3 pr-10">
          {/* Category Icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
            }}
          >
            {getCategoryIcon(memory.metadata.category)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ minHeight: '36px' }}>
            {/* Category Badge */}
            {memory.metadata.category && (
              <div className="mb-1.5">
                <span className="inline-flex items-center text-[9px] text-text-secondary uppercase px-2 py-1 rounded bg-white/5 whitespace-nowrap" style={{ height: '20px' }}>
                  {memory.metadata.category}
                </span>
              </div>
            )}
            
            {/* Text Preview */}
            <p className="text-[11px] font-medium text-text-primary leading-relaxed">
              {truncateText(memory.content)}
            </p>
          </div>
        </div>
      ) : (
        /* Expanded View */
        <div className="space-y-3">
          {/* Header with Icon and Category */}
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
              style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
              }}
            >
              {getCategoryIcon(memory.metadata.category)}
            </div>
            
            <div className="flex-1 min-w-0">
              {memory.metadata.category && (
                <span className="inline-flex items-center text-[9px] text-text-secondary uppercase px-2 py-1 rounded bg-white/5">
                  {memory.metadata.category}
                </span>
              )}
            </div>
          </div>

          {/* Full Content */}
          <div className="pl-12 pr-6">
            <p className="text-[11px] font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
              {memory.content}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="pl-12 pr-6 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-text-secondary">
            <div className="flex items-center gap-3">
              {memory.metadata.importance && (
                <span className="px-2 py-0.5 rounded bg-white/5">
                  {memory.metadata.importance}
                </span>
              )}
              {memory.metadata.tags && memory.metadata.tags.length > 0 && (
                <div className="flex gap-1">
                  {memory.metadata.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span>{formatDate(memory.created_at)}</span>
          </div>
        </div>
      )}
    </div>
  );
});
MemoryCard.displayName = 'MemoryCard';

export const MemorySearchUI = memo<ToolCallUIProps>(({ result }) => {
  if (!result) {
    return (
      <div className="text-sm text-text-secondary p-4">
        Searching memories...
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="text-sm text-red-400 p-4">
        {result.error || 'Failed to search memories'}
      </div>
    );
  }

  // Parse the result
  let data: MemorySearchResult;
  try {
    data = JSON.parse(result.output);
  } catch (e) {
    return (
      <div className="text-sm text-text-secondary p-4">
        <pre className="whitespace-pre-wrap font-mono text-xs">{result.output}</pre>
      </div>
    );
  }

  if (!data.results || data.results.length === 0) {
    return (
      <div className="text-sm text-text-secondary p-4 text-center">
        <Brain size={24} className="mx-auto mb-2 opacity-40" />
        <p>No memories found for "{data.query}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Results Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-secondary">
          Found {data.results.length} memor{data.results.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.results.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
});

MemorySearchUI.displayName = 'MemorySearchUI';
