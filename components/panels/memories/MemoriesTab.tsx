/**
 * MemoriesTab - Display and manage AI agent long-term memories
 * Inspired by AgentSmith's Trace model with persistent, searchable memory
 */
import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Brain, Trash2, Tag, StickyNote, Calendar, User, Bot, Cpu, Plus, X, ChevronDown, ChevronRight, Star, Archive } from 'lucide-react';
import { memoryService, type Memory, type MemoryMetadata } from '../../../services/memoryService';

interface MemoriesTabProps {
  sessionId?: string;
  searchQuery?: string;
}

export const MemoriesTab = ({ sessionId, searchQuery = '' }: MemoriesTabProps) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [visibleRows, setVisibleRows] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('');
  const [newMemoryTags, setNewMemoryTags] = useState('');

  const categories = useMemo(() => ['all', ...memories.map(m => m.metadata.category).filter((c): c is string => !!c)], [memories]);
  const tags = useMemo(() => ['all', ...memories.flatMap(m => m.metadata.tags || [])], [memories]);

  const loadMemories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await memoryService.list(sessionId);
      setMemories(data);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        loadMemories();
        return;
      }

      try {
        const data = await memoryService.search(searchQuery, undefined, sessionId);
        setMemories(data);
      } catch (error) {
        console.error('Failed to search memories:', error);
      }
    };

    performSearch();
  }, [searchQuery, sessionId, loadMemories]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await memoryService.delete(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  }, []);

  const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
    try {
      const updated = await memoryService.updateNotes(id, notes);
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  }, []);

  const handleUpdateMetadata = useCallback(async (id: string, metadata: Partial<MemoryMetadata>) => {
    try {
      const updated = await memoryService.updateMetadata(id, metadata);
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }, []);

  const handleAddMemory = useCallback(async () => {
    if (!newMemoryContent.trim()) return;

    try {
      const tags = newMemoryTags.split(',').map(t => t.trim()).filter(Boolean);
      await memoryService.create({
        content: newMemoryContent,
        role: 'assistant',
        session_id: sessionId || null,
        metadata: {
          category: newMemoryCategory || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      });
      setNewMemoryContent('');
      setNewMemoryCategory('');
      setNewMemoryTags('');
      setIsAddingMemory(false);
      loadMemories();
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  }, [newMemoryContent, newMemoryCategory, newMemoryTags, sessionId, loadMemories]);

  const filteredMemories = useMemo(() => {
    let filtered = memories;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.metadata.category === selectedCategory);
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter(m => m.metadata.tags?.includes(selectedTag));
    }

    return filtered;
  }, [memories, selectedCategory, selectedTag]);

  const itemsPerRow = 2;
  const displayedMemories = showAll ? filteredMemories : filteredMemories.slice(0, visibleRows * itemsPerRow);
  const hasMore = filteredMemories.length > (visibleRows * itemsPerRow) && !showAll;
  const remainingCount = filteredMemories.length - (visibleRows * itemsPerRow);

  const handleViewMore = () => {
    // Show all remaining memories at once
    setShowAll(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-[11px] text-text-secondary font-jakarta">Loading memories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Add Memory Button */}
      {!isAddingMemory && (
        <button
          onClick={() => setIsAddingMemory(true)}
          className="w-full flex items-center justify-center gap-2 text-[11px] text-text-primary bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-lg px-4 py-2.5"
        >
          <Plus size={14} />
          Add new memory
        </button>
      )}

      {/* Add Memory Form */}
      {isAddingMemory && (
        <div className="space-y-3 glass-subtle rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-primary font-jakarta">New Memory</span>
            <button
              onClick={() => setIsAddingMemory(false)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X size={14} className="text-text-secondary" />
            </button>
          </div>
          <textarea
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="What should the AI remember?"
            className="w-full bg-white/5 text-[11px] text-text-primary font-jakarta outline-none px-3 py-2 rounded resize-none"
            rows={3}
          />
          <input
            type="text"
            value={newMemoryCategory}
            onChange={(e) => setNewMemoryCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-full bg-white/5 text-[11px] text-text-primary font-jakarta outline-none px-3 py-2 rounded"
          />
          <input
            type="text"
            value={newMemoryTags}
            onChange={(e) => setNewMemoryTags(e.target.value)}
            placeholder="Tags (comma-separated, optional)"
            className="w-full bg-white/5 text-[11px] text-text-primary font-jakarta outline-none px-3 py-2 rounded"
          />
          <button
            onClick={handleAddMemory}
            disabled={!newMemoryContent.trim()}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[11px] font-semibold font-jakarta rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Memory
          </button>
        </div>
      )}

      {/* Filters */}
      {!isAddingMemory && (categories.length > 1 || tags.length > 1) && (
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Archive size={10} className="text-text-secondary" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white/5 text-text-secondary outline-none px-2 py-1 rounded"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          )}
          {tags.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Tag size={10} className="text-text-secondary" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-white/5 text-text-secondary outline-none px-2 py-1 rounded"
              >
                {tags.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Tags' : t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Memories Display */}
      {displayedMemories.length === 0 ? (
        <div className="p-8 text-center">
          <Brain size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
          <p className="text-[12px] font-semibold text-text-secondary font-jakarta">
            No memories yet
          </p>
          <p className="text-[10px] text-text-secondary font-jakarta mt-1">
            Add memories to help the AI remember important context
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onDelete={handleDelete}
                onUpdateNotes={handleUpdateNotes}
                onUpdateMetadata={handleUpdateMetadata}
              />
            ))}
          </div>

          {hasMore && (
            <div className="pt-3 border-t border-dashed border-glass-border">
              <button
                onClick={handleViewMore}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] text-text-secondary hover:text-text-primary transition-all duration-200 rounded px-3 py-2"
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
                <ChevronDown size={12} />
                View {remainingCount} more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

MemoriesTab.displayName = 'MemoriesTab';

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateMetadata: (id: string, metadata: Partial<MemoryMetadata>) => void;
}

const MemoryCard = memo<MemoryCardProps>(({ memory, onDelete, onUpdateNotes, onUpdateMetadata }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(memory.notes || '');

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(memory.id, notesValue);
    setIsEditingNotes(false);
  };

  const handleUpdateImportance = (importance: 'low' | 'medium' | 'high') => {
    onUpdateMetadata(memory.id, { importance });
  };

  const getRoleIcon = () => {
    switch (memory.role) {
      case 'user':
        return <User size={16} className="text-blue-400" />;
      case 'system':
        return <Cpu size={16} className="text-yellow-400" />;
      default:
        return <Bot size={16} className="text-purple-400" />;
    }
  };

  // Truncate text for preview - horizontal display (shorter for better preview)
  // Truncate text for preview - show only beginning (first sentence or 60 chars)
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

  return (
    <div
      className="rounded-lg glass-subtle p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 relative"
      onClick={() => setExpanded(!expanded)}
      style={{
        minHeight: expanded ? 'auto' : '110px',
        boxShadow: expanded
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
          : '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
      }}
    >
      {/* Chevron Button - Top Right Corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="absolute top-3 right-3 p-1.5 rounded transition-all duration-200 hover:bg-white/10 z-10"
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
        }}
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
          {/* Role Icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
            }}
          >
            {getRoleIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            {memory.metadata.category && (
              <div className="mb-2">
                <span className="inline-block text-[9px] text-text-secondary uppercase px-2 py-1 rounded bg-white/5 whitespace-nowrap">
                  {memory.metadata.category}
                </span>
              </div>
            )}
            
            {/* Text Preview - Horizontal */}
            <p className="text-[11px] font-medium text-text-primary leading-relaxed">
              {truncateText(memory.content)}
            </p>
          </div>
        </div>
      ) : (
        /* Expanded View */
        <div className="space-y-4 pr-10">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
              style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
              }}
            >
              {getRoleIcon()}
            </div>

            <div className="flex-1">
              {memory.metadata.category && (
                <span className="inline-block text-[9px] text-text-secondary uppercase px-2 py-1 rounded bg-white/5">
                  {memory.metadata.category}
                </span>
              )}
            </div>
          </div>

          {/* Full Content */}
          <div className="pl-12">
            <p className="text-[11px] text-text-primary leading-relaxed">
              {memory.content}
            </p>
          </div>

          {/* Metadata Section */}
          <div className="pl-12 space-y-3 pt-3 border-t border-dashed border-glass-border">
            {/* Tags */}
            {memory.metadata.tags && memory.metadata.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={10} className="text-text-secondary flex-shrink-0" />
                {memory.metadata.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] text-text-secondary px-2 py-0.5 rounded bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="flex items-start gap-2">
              <StickyNote size={10} className="text-text-secondary flex-shrink-0 mt-0.5" />
              {isEditingNotes ? (
                <input
                  type="text"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleSaveNotes}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNotes()}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white/5 text-[10px] font-jakarta text-text-primary outline-none px-2 py-1 rounded"
                  placeholder="Add notes..."
                  autoFocus
                />
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNotes(true);
                  }}
                  className="flex-1 text-[10px] text-text-secondary font-jakarta cursor-text hover:text-text-primary"
                >
                  {memory.notes || 'Add notes...'}
                </div>
              )}
            </div>

            {/* Importance */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary">Importance:</span>
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateImportance(level);
                  }}
                  className={`text-[9px] px-2 py-1 rounded capitalize transition-colors ${
                    memory.metadata.importance === level
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-dashed border-glass-border">
              <span className="text-[10px] text-text-secondary flex items-center gap-1.5">
                <Calendar size={10} />
                {formatDate(memory.created_at)}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(memory.id, e);
                }}
                className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
              >
                <Trash2 size={10} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MemoryCard.displayName = 'MemoryCard';
