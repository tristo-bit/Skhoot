/**
 * Memory Service
 * Handles AI agent long-term memory operations with localStorage (file-based for desktop)
 * Inspired by AgentSmith's Trace model for persistent, searchable memory
 */

const STORAGE_KEY = 'skhoot_memories';
const MAX_MEMORIES = 1000;

export interface MemoryMetadata {
  importance?: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];
  source?: 'user' | 'agent' | 'system';
  tokens_used?: number;
  embedding?: string;
}

export interface Memory {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  session_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: MemoryMetadata;
  notes?: string | null;
}

export interface CreateMemoryRequest {
  content: string;
  role?: 'user' | 'assistant' | 'system';
  session_id?: string | null;
  metadata?: Partial<MemoryMetadata>;
  notes?: string;
}

class MemoryService {
  private memories: Memory[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.memories = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to load from storage:', error);
      this.memories = [];
    }
  }

  private saveToStorage(): void {
    try {
      const trimmed = this.memories.slice(0, MAX_MEMORIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[MemoryService] Failed to save to storage:', error);
    }
  }

  async create(request: CreateMemoryRequest): Promise<Memory> {
    const now = new Date().toISOString();
    const memory: Memory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      content: request.content,
      role: request.role || 'assistant',
      session_id: request.session_id || null,
      created_at: now,
      updated_at: now,
      metadata: {
        importance: request.metadata?.importance || 'medium',
        category: request.metadata?.category,
        tags: request.metadata?.tags || [],
        source: request.metadata?.source || 'agent',
        tokens_used: request.metadata?.tokens_used,
        embedding: request.metadata?.embedding,
      },
      notes: request.notes || null,
    };

    this.memories.unshift(memory);
    this.saveToStorage();
    return memory;
  }

  async list(sessionId?: string, limit?: number): Promise<Memory[]> {
    let filtered = this.memories;

    if (sessionId) {
      filtered = filtered.filter(m => m.session_id === sessionId);
    }

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  async get(id: string): Promise<Memory | null> {
    return this.memories.find(m => m.id === id) || null;
  }

  async delete(id: string): Promise<void> {
    this.memories = this.memories.filter(m => m.id !== id);
    this.saveToStorage();
  }

  async search(query: string, limit?: number, sessionId?: string): Promise<Memory[]> {
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 0);

    interface ScoredMemory extends Memory {
      _score: number;
    }

    const memoriesToSearch = [...this.memories];

    const scoredMemories = memoriesToSearch
      .filter(m => {
        // Cross-session search: don't filter by sessionId
        // This allows finding memories from any past session
        // If sessionId is provided, we'll still search everything
        // The caller can decide whether to scope the search

        // Calculate relevance score
        let localScore = 0;
        const contentLower = m.content.toLowerCase();
        const categoryLower = (m.metadata.category || '').toLowerCase();
        const notesLower = (m.notes || '').toLowerCase();
        const tags = m.metadata.tags || [];

        // Exact matches get highest score
        queryTerms.forEach(term => {
          // Content exact match
          if (contentLower.includes(term)) {
            localScore += 10;
            // Bonus for exact phrase match
            if (contentLower.includes(query)) {
              localScore += 5;
            }
          }

          // Category match
          if (categoryLower.includes(term)) {
            localScore += 8;
          }

          // Notes match
          if (notesLower.includes(term)) {
            localScore += 6;
          }

          // Tag match
          if (tags.some(t => t.toLowerCase().includes(term))) {
            localScore += 4;
          }

          // Importance bonus
          if (m.metadata.importance === 'high') {
            localScore += 3;
          } else if (m.metadata.importance === 'medium') {
            localScore += 1;
          }
        });

        return localScore > 0;
      })
      .map(m => ({ ...m, _score: localScore }))
      .sort((a: any, b: any) => {
        const scoreA = a._score;
        const scoreB = b._score;
        const scoreDiff = scoreB - scoreA;
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .map((m: any) => {
        const { _score, ...rest } = m;
        return rest as Memory;
      }) as Memory[];

    if (limit) {
      scoredMemories.length = Math.min(scoredMemories.length, limit);
    }

    return scoredMemories;
  }

  async recent(limit: number = 10, sessionId?: string): Promise<Memory[]> {
    let filtered = this.memories;

    if (sessionId) {
      filtered = filtered.filter(m => m.session_id === sessionId);
    }

    return filtered.slice(0, limit);
  }

  async update(id: string, updates: Partial<CreateMemoryRequest>): Promise<Memory | null> {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) return null;

    if (updates.content) memory.content = updates.content;
    if (updates.role) memory.role = updates.role;
    if (updates.session_id !== undefined) memory.session_id = updates.session_id;
    if (updates.metadata) {
      memory.metadata = { ...memory.metadata, ...updates.metadata };
    }
    if (updates.notes !== undefined) memory.notes = updates.notes;
    memory.updated_at = new Date().toISOString();

    this.saveToStorage();
    return memory;
  }

  async updateNotes(id: string, notes: string): Promise<Memory | null> {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) return null;

    memory.notes = notes;
    memory.updated_at = new Date().toISOString();
    this.saveToStorage();
    return memory;
  }

  async updateMetadata(id: string, metadata: Partial<MemoryMetadata>): Promise<Memory | null> {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) return null;

    memory.metadata = { ...memory.metadata, ...metadata };
    memory.updated_at = new Date().toISOString();
    this.saveToStorage();
    return memory;
  }

  async getByCategory(category: string, limit?: number): Promise<Memory[]> {
    let results = this.memories.filter(m => m.metadata.category === category);

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async getByTag(tag: string, limit?: number): Promise<Memory[]> {
    let results = this.memories.filter(m => m.metadata.tags?.includes(tag));

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async getAllCategories(): Promise<string[]> {
    const categories = new Set<string>();
    this.memories.forEach(m => {
      if (m.metadata.category) {
        categories.add(m.metadata.category);
      }
    });
    return Array.from(categories).sort();
  }

  async getAllTags(): Promise<string[]> {
    const tags = new Set<string>();
    this.memories.forEach(m => {
      m.metadata.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }
}

export const memoryService = new MemoryService();
