/**
 * BookmarksTab - Display and manage bookmarked messages
 * Uses the same grid/list design as WebSearchUI
 */
import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Bookmark, Trash2, Tag, StickyNote, Search, Calendar, User, Bot, ExternalLink, Grid3x3, List as ListIcon, ChevronRight, ChevronDown, MessageSquare } from 'lucide-react';
import { bookmarkService, type Bookmark as BookmarkItem } from '../../../services/bookmarkService';

interface BookmarksTabProps {
  sessionId?: string;
  viewMode: 'grid' | 'list';
  searchQuery?: string;
}

export const BookmarksTab = ({ sessionId, viewMode, searchQuery = '' }: BookmarksTabProps) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [visibleRows, setVisibleRows] = useState(1);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bookmarkService.list(sessionId);
      setBookmarks(data);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Handle search from parent
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        loadBookmarks();
        return;
      }

      try {
        const data = await bookmarkService.search(searchQuery);
        setBookmarks(data);
      } catch (error) {
        console.error('Failed to search bookmarks:', error);
      }
    };

    performSearch();
  }, [searchQuery, loadBookmarks]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bookmarkService.delete(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  }, []);

  const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
    try {
      const updated = await bookmarkService.updateNotes(id, notes);
      setBookmarks(prev => prev.map(b => b.id === id ? updated : b));
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  }, []);

  const handleUpdateTags = useCallback(async (id: string, tags: string) => {
    try {
      const updated = await bookmarkService.updateTags(id, tags);
      setBookmarks(prev => prev.map(b => b.id === id ? updated : b));
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  }, []);

  // Calculate items per row for grid view
  const itemsPerRow = 4;

  const displayedBookmarks = useMemo(() => {
    if (viewMode === 'list' || showAll) return bookmarks;
    return bookmarks.slice(0, visibleRows * itemsPerRow);
  }, [bookmarks, viewMode, showAll, visibleRows]);

  const hasMore = bookmarks.length > (visibleRows * itemsPerRow) && viewMode === 'grid' && !showAll;
  const remainingCount = bookmarks.length - (visibleRows * itemsPerRow);

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
        <p className="text-[11px] text-text-secondary font-jakarta">Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Bookmarks Display */}
      {bookmarks.length === 0 ? (
        <div className="p-8 text-center">
          <Bookmark size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
          <p className="text-[12px] font-semibold text-text-secondary font-jakarta">
            No bookmarks yet
          </p>
          <p className="text-[10px] text-text-secondary font-jakarta mt-1">
            Bookmark messages to quickly reference them later
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-fr">
              {displayedBookmarks.map((bookmark) => (
                <GridBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={(e) => handleDelete(bookmark.id, e)}
                  onUpdateNotes={(notes) => handleUpdateNotes(bookmark.id, notes)}
                  onUpdateTags={(tags) => handleUpdateTags(bookmark.id, tags)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-hidden">
              {displayedBookmarks.map((bookmark, i) => (
                <ListBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  isLast={i === displayedBookmarks.length - 1}
                  onDelete={(e) => handleDelete(bookmark.id, e)}
                  onUpdateNotes={(notes) => handleUpdateNotes(bookmark.id, notes)}
                  onUpdateTags={(tags) => handleUpdateTags(bookmark.id, tags)}
                />
              ))}
            </div>
          )}

          {/* View More button */}
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

BookmarksTab.displayName = 'BookmarksTab';

// ============================================================================
// Grid Bookmark Card Component
// ============================================================================

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  onDelete: (e: React.MouseEvent) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateTags: (tags: string) => void;
}

// Navigate to bookmarked message
const navigateToMessage = (messageId: string) => {
  // Close the FileExplorerPanel first
  const closeEvent = new CustomEvent('close-file-explorer');
  window.dispatchEvent(closeEvent);
  
  // Wait a bit for the panel to close, then scroll to message
  setTimeout(() => {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      messageEl.classList.add('highlight-flash');
      setTimeout(() => {
        messageEl.classList.remove('highlight-flash');
      }, 2000);
    } else {
      console.warn('[BookmarksTab] Message not found in current conversation:', messageId);
    }
  }, 300); // Wait for panel close animation
};

const GridBookmarkCard = memo<BookmarkCardProps>(({
  bookmark,
  onDelete,
  onUpdateNotes,
  onUpdateTags,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [notesValue, setNotesValue] = useState(bookmark.notes || '');
  const [tagsValue, setTagsValue] = useState(bookmark.tags || '');

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(notesValue);
    setIsEditingNotes(false);
  };

  const handleSaveTags = () => {
    onUpdateTags(tagsValue);
    setIsEditingTags(false);
  };

  const tags = bookmark.tags ? bookmark.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

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
          {bookmark.role === 'user' ? (
            <User size={12} className="text-blue-400" />
          ) : (
            <Bot size={12} className="text-purple-400" />
          )}
        </div>

        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-text-primary leading-snug line-clamp-2">
            {bookmark.content}
          </p>
        </div>

        {/* Go Button - Always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateToMessage(bookmark.message_id);
          }}
          className="flex-shrink-0 p-1 rounded transition-all duration-200 mt-0.5"
          style={{
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 1px rgba(255, 255, 255, 0.2)'
          }}
          title="Go to message"
        >
          <MessageSquare size={12} className="text-blue-400" />
        </button>

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
        <div className="flex flex-col flex-grow">
          <div className="pl-7 pr-1 pt-3 pb-3 flex-grow">
            <p className="text-[10px] text-text-secondary leading-relaxed break-words">
              {bookmark.content}
            </p>
          </div>
          
          <div className="pl-7 pr-1 pt-2 border-t border-dashed border-glass-border">
            {/* Single line footer with all actions */}
            <div className="flex items-center gap-2 text-[9px] flex-wrap">
              {/* Tags */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Tag size={9} className="text-text-secondary flex-shrink-0" />
                {isEditingTags ? (
                  <input
                    type="text"
                    value={tagsValue}
                    onChange={(e) => setTagsValue(e.target.value)}
                    onBlur={handleSaveTags}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTags()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white/5 text-[9px] font-jakarta text-text-primary outline-none px-1 py-0.5 rounded"
                    placeholder="Add tags..."
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTags(true);
                    }}
                    className="flex-1 text-[9px] text-text-secondary font-jakarta cursor-text hover:text-text-primary truncate"
                  >
                    {tags.length > 0 ? tags.join(', ') : 'Tags'}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <StickyNote size={9} className="text-text-secondary flex-shrink-0" />
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
                    {bookmark.notes || 'Notes'}
                  </div>
                )}
              </div>

              {/* Date */}
              <span className="text-text-secondary flex items-center gap-1 flex-shrink-0">
                <Calendar size={9} />
                {formatDate(bookmark.created_at)}
              </span>

              {/* Go Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToMessage(bookmark.message_id);
                }}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                title="Go to message"
              >
                <MessageSquare size={9} />
                Go
              </button>

              {/* Remove Button */}
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
              >
                <Trash2 size={9} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

GridBookmarkCard.displayName = 'GridBookmarkCard';

// ============================================================================
// List Bookmark Card Component
// ============================================================================

interface ListBookmarkCardProps extends BookmarkCardProps {
  isLast: boolean;
}

const ListBookmarkCard = memo<ListBookmarkCardProps>(({
  bookmark,
  isLast,
  onDelete,
  onUpdateNotes,
  onUpdateTags,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [notesValue, setNotesValue] = useState(bookmark.notes || '');
  const [tagsValue, setTagsValue] = useState(bookmark.tags || '');

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(notesValue);
    setIsEditingNotes(false);
  };

  const handleSaveTags = () => {
    onUpdateTags(tagsValue);
    setIsEditingTags(false);
  };

  const tags = bookmark.tags ? bookmark.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

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
          {bookmark.role === 'user' ? (
            <User size={12} className="text-blue-400" />
          ) : (
            <Bot size={12} className="text-purple-400" />
          )}
        </div>

        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase">
              {bookmark.role}
            </span>
            <span className="text-[9px] text-text-secondary flex items-center gap-1">
              <Calendar size={8} />
              {formatDate(bookmark.created_at)}
            </span>
          </div>
          <p className={`text-[11px] font-medium text-text-primary leading-snug ${!expanded ? 'line-clamp-1' : ''}`}>
            {bookmark.content}
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
          <ChevronRight 
            size={12} 
            className={`text-text-secondary transition-transform ${expanded ? 'rotate-90' : ''}`} 
          />
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <>
          <div className="pl-7 pr-1 pt-3 pb-3">
            <p className="text-[10px] text-text-secondary leading-relaxed break-words">
              {bookmark.content}
            </p>
          </div>
          
          <div className="pl-7 pr-1 pt-2 border-t border-dashed border-glass-border">
            {/* Single line footer with all actions */}
            <div className="flex items-center gap-2 text-[9px] flex-wrap">
              {/* Tags */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Tag size={9} className="text-text-secondary flex-shrink-0" />
                {isEditingTags ? (
                  <input
                    type="text"
                    value={tagsValue}
                    onChange={(e) => setTagsValue(e.target.value)}
                    onBlur={handleSaveTags}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTags()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white/5 text-[9px] font-jakarta text-text-primary outline-none px-1 py-0.5 rounded"
                    placeholder="Add tags..."
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTags(true);
                    }}
                    className="flex-1 text-[9px] text-text-secondary font-jakarta cursor-text hover:text-text-primary truncate"
                  >
                    {tags.length > 0 ? tags.join(', ') : 'Tags'}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <StickyNote size={9} className="text-text-secondary flex-shrink-0" />
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
                    {bookmark.notes || 'Notes'}
                  </div>
                )}
              </div>

              {/* Date */}
              <span className="text-text-secondary flex items-center gap-1 flex-shrink-0">
                <Calendar size={9} />
                {formatDate(bookmark.created_at)}
              </span>

              {/* Go Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToMessage(bookmark.message_id);
                }}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                title="Go to message"
              >
                <MessageSquare size={9} />
                Go
              </button>

              {/* Remove Button */}
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
              >
                <Trash2 size={9} />
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ListBookmarkCard.displayName = 'ListBookmarkCard';
