/**
 * Bookmark Service
 * Handles bookmark operations with localStorage (file-based for desktop)
 */

const STORAGE_KEY = 'skhoot_bookmarks';
const MAX_BOOKMARKS = 1000; // Limit to prevent storage overflow

export interface Bookmark {
  id: string;
  message_id: string;
  session_id: string | null;
  content: string;
  role: string;
  created_at: string;
  tags: string | null;
  notes: string | null;
}

export interface CreateBookmarkRequest {
  message_id: string;
  session_id?: string | null;
  content: string;
  role: string;
  tags?: string;
  notes?: string;
}

class BookmarkService {
  private bookmarks: Bookmark[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.bookmarks = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[BookmarkService] Failed to load from storage:', error);
      this.bookmarks = [];
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only the most recent bookmarks
      const trimmed = this.bookmarks.slice(0, MAX_BOOKMARKS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[BookmarkService] Failed to save to storage:', error);
    }
  }

  /**
   * Create a new bookmark
   */
  async create(request: CreateBookmarkRequest): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      message_id: request.message_id,
      session_id: request.session_id || null,
      content: request.content,
      role: request.role,
      created_at: new Date().toISOString(),
      tags: request.tags || null,
      notes: request.notes || null,
    };

    // Check if bookmark already exists for this message
    const existingIndex = this.bookmarks.findIndex(b => b.message_id === request.message_id);
    if (existingIndex >= 0) {
      // Update existing bookmark
      this.bookmarks[existingIndex] = bookmark;
    } else {
      // Add new bookmark at the beginning
      this.bookmarks.unshift(bookmark);
    }

    this.saveToStorage();
    return bookmark;
  }

  /**
   * List all bookmarks
   */
  async list(sessionId?: string, limit?: number): Promise<Bookmark[]> {
    let filtered = this.bookmarks;

    if (sessionId) {
      filtered = filtered.filter(b => b.session_id === sessionId);
    }

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  /**
   * Get a specific bookmark
   */
  async get(id: string): Promise<Bookmark | null> {
    return this.bookmarks.find(b => b.id === id) || null;
  }

  /**
   * Delete a bookmark
   */
  async delete(id: string): Promise<void> {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.saveToStorage();
  }

  /**
   * Search bookmarks
   */
  async search(query: string, limit?: number): Promise<Bookmark[]> {
    const lowerQuery = query.toLowerCase();
    let results = this.bookmarks.filter(b =>
      b.content.toLowerCase().includes(lowerQuery) ||
      b.tags?.toLowerCase().includes(lowerQuery) ||
      b.notes?.toLowerCase().includes(lowerQuery) ||
      b.message_id.toLowerCase().includes(lowerQuery)
    );

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Update bookmark notes
   */
  async updateNotes(id: string, notes: string): Promise<Bookmark | null> {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (!bookmark) return null;

    bookmark.notes = notes;
    this.saveToStorage();
    return bookmark;
  }

  /**
   * Update bookmark tags
   */
  async updateTags(id: string, tags: string): Promise<Bookmark | null> {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (!bookmark) return null;

    bookmark.tags = tags;
    this.saveToStorage();
    return bookmark;
  }

  /**
   * Check if a message is bookmarked
   */
  async isBookmarked(messageId: string): Promise<boolean> {
    return this.bookmarks.some(b => b.message_id === messageId);
  }

  /**
   * Find bookmark by message ID
   */
  async findByMessageId(messageId: string): Promise<Bookmark | null> {
    return this.bookmarks.find(b => b.message_id === messageId) || null;
  }
}

export const bookmarkService = new BookmarkService();
