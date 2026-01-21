/**
 * MemoriesTab - Display and manage AI agent long-term memories
 * Inspired by AgentSmith's Trace model with persistent, searchable memory
 */
import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Brain, Trash2, Tag, StickyNote, Search, Calendar, User, Bot, Cpu, Plus, Edit3, X, Check, ChevronDown, ChevronRight, Star, Archive } from 'lucide-react';
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

  const itemsPerRow = 3;
  const displayedMemories = showAll ? filteredMemories : filteredMemories.slice(0, visibleRows * itemsPerRow);
  const hasMore = filteredMemories.length > (visibleRows * itemsPerRow) && !showAll;
  const remainingCount = filteredMemories.length - (visibleRows * itemsPerRow);

  const handleViewMore = () => {
    if (remainingCount <= itemsPerRow) {
      setShowAll(true);
    } else {
      setVisibleRows(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-[11px] text-text-secondary font-jakarta">Loading memories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Add Memory Button */}
      {!isAddingMemory && (
        <button
          onClick={() => setIsAddingMemory(true)}
          className="w-full flex items-center justify-center gap-2 text-[10px] text-text-primary bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-lg px-3 py-2"
        >
          <Plus size={12} />
          Add new memory
        </button>
      )}

      {/* Add Memory Form */}
      {isAddingMemory && (
        <div className="space-y-2 glass-subtle rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-text-primary font-jakarta">New Memory</span>
            <button
              onClick={() => setIsAddingMemory(false)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X size={12} className="text-text-secondary" />
            </button>
          </div>
          <textarea
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="What should the AI remember?"
            className="w-full bg-white/5 text-[10px] text-text-primary font-jakarta outline-none px-2 py-1.5 rounded resize-none"
            rows={3}
          />
          <input
            type="text"
            value={newMemoryCategory}
            onChange={(e) => setNewMemoryCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-full bg-white/5 text-[10px] text-text-primary font-jakarta outline-none px-2 py-1.5 rounded"
          />
          <input
            type="text"
            value={newMemoryTags}
            onChange={(e) => setNewMemoryTags(e.target.value)}
            placeholder="Tags (comma-separated, optional)"
            className="w-full bg-white/5 text-[10px] text-text-primary font-jakarta outline-none px-2 py-1.5 rounded"
          />
          <button
            onClick={handleAddMemory}
            disabled={!newMemoryContent.trim()}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] font-semibold font-jakarta rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Memory
          </button>
        </div>
      )}

      {/* Filters */}
      {!isAddingMemory && (categories.length > 1 || tags.length > 1) && (
        <div className="flex items-center gap-2 text-[9px] flex-wrap">
          {categories.length > 1 && (
            <div className="flex items-center gap-1">
              <Archive size={8} className="text-text-secondary" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white/5 text-text-secondary outline-none px-1.5 py-0.5 rounded"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          )}
          {tags.length > 1 && (
            <div className="flex items-center gap-1">
              <Tag size={8} className="text-text-secondary" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-white/5 text-text-secondary outline-none px-1.5 py-0.5 rounded"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="pt-2 border-t border-dashed border-glass-border">
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
        return <User size={12} className="text-blue-400" />;
      case 'system':
        return <Cpu size={12} className="text-yellow-400" />;
      default:
        return <Bot size={12} className="text-purple-400" />;
    }
  };

  const getImportanceColor = () => {
    switch (memory.metadata.importance) {
      case 'high':
        return 'text-yellow-400';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-blue-400';
    }
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
        {/* Role Icon */}
        <div
          className="flex-shrink-0 w-5 h-5 rounded overflow-hidden mt-0.5 flex items-center justify-center"
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0.5px 1px rgba(255, 255, 255, 0.15)'
          }}
        >
          {getRoleIcon()}
        </div>

        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            {memory.metadata.importance && (
              <Star size={8} className={getImportanceColor()} fill={memory.metadata.importance === 'high' ? 'currentColor' : 'none'} />
            )}
            {memory.metadata.category && (
              <span className="text-[8px] text-text-secondary uppercase px-1 rounded bg-white/5">
                {memory.metadata.category}
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-text-primary leading-snug line-clamp-2">
            {memory.content}
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
          <ChevronRight size={12} className="text-text-secondary" />
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="flex flex-col flex-grow mt-3">
          <div className="pl-7 pr-1 py-2 flex-grow">
            <p className="text-[10px] text-text-secondary leading-relaxed break-words">
              {memory.content}
            </p>
          </div>

          <div className="pl-7 pr-1 pt-2 border-t border-dashed border-glass-border">
            {/* Tags */}
            {memory.metadata.tags && memory.metadata.tags.length > 0 && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                <Tag size={8} className="text-text-secondary" />
                {memory.metadata.tags.map((tag, i) => (
                  <span key={i} className="text-[8px] text-text-secondary px-1 py-0.5 rounded bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="flex items-start gap-1 mb-2">
              <StickyNote size={9} className="text-text-secondary flex-shrink-0 mt-0.5" />
              {isEditingNotes ? (
                <input
                  type="text"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleSaveNotes}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNotes()}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white/5 text-[9px] font-jakarta text-text-primary outline-none px-1 py-0.5 rounded"
                  placeholder="Add notes..."
                  autoFocus
                />
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNotes(true);
                  }}
                  className="flex-1 text-[9px] text-text-secondary font-jakarta cursor-text hover:text-text-primary truncate"
                >
                  {memory.notes || 'Notes'}
                </div>
              )}
            </div>

            {/* Importance */}
            <div className="flex items-center gap-1 mb-2">
              <Star size={9} className="text-text-secondary" />
              <span className="text-[9px] text-text-secondary">Importance:</span>
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateImportance(level);
                  }}
                  className={`text-[8px] px-1.5 py-0.5 rounded capitalize transition-colors ${
                    memory.metadata.importance === level
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[9px] text-text-secondary flex items-center gap-1">
                <Calendar size={8} />
                {formatDate(memory.created_at)}
              </span>

              <button
                onClick={(e) => onDelete(memory.id, e)}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={9} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MemoryCard.displayName = 'MemoryCard';
