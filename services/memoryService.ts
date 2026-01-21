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
    let results = this.memories.filter(m => {
      const matchesQuery =
        m.content.toLowerCase().includes(lowerQuery) ||
        m.metadata.category?.toLowerCase().includes(lowerQuery) ||
        m.metadata.tags?.some(t => t.toLowerCase().includes(lowerQuery)) ||
        m.notes?.toLowerCase().includes(lowerQuery);

      const matchesSession = !sessionId || m.session_id === sessionId;
      return matchesQuery && matchesSession;
    });

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
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
