import { Chat, Message } from '../types';

const STORAGE_KEY_PREFIX = 'skhoot_chat_';
const INDEX_KEY = 'skhoot_chat_index';

interface ChatIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to serialize dates for storage
const serializeChat = (chat: Chat): string => {
  return JSON.stringify({
    ...chat,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    messages: chat.messages.map(m => {
      // Optimize tool results for storage: strip large data that isn't needed for UI
      if (m.role === 'assistant' && m.toolResults) {
        return {
          ...m,
          timestamp: m.timestamp.toISOString(),
          toolResults: m.toolResults.map(tr => {
            let optimizedOutput = tr.output;
            
            if (tr.toolCallName === 'web_search' && tr.output) {
              try {
                const parsed = JSON.parse(tr.output);
                if (parsed.gathered_pages) {
                  // Remove gathered_pages from stored output to save quota
                  // The UI only needs search_results/results
                  const { gathered_pages, ...optimized } = parsed;
                  optimizedOutput = JSON.stringify(optimized);
                }
              } catch (e) {
                // Not JSON or parse error, keep as is
              }
            }

            // General safety: Truncate extremely large outputs for storage
            // 100KB is usually plenty for UI display but small enough for localStorage
            const MAX_STORAGE_OUTPUT_SIZE = 100 * 1024;
            if (optimizedOutput && optimizedOutput.length > MAX_STORAGE_OUTPUT_SIZE) {
              optimizedOutput = optimizedOutput.substring(0, MAX_STORAGE_OUTPUT_SIZE) + '... (truncated for storage)';
            }

            return { ...tr, output: optimizedOutput };
          })
        };
      }
      return {
        ...m,
        timestamp: m.timestamp.toISOString()
      };
    })
  });
};

// Helper to deserialize dates from storage
const deserializeChat = (data: any): Chat => {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    messages: data.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }))
  };
};

export const chatStorage = {
  // Get all chats (metadata only for the list)
  getChats(): Chat[] {
    try {
      // Migration from old format if needed
      const oldData = localStorage.getItem('skhoot_chats');
      if (oldData) {
        console.log('[chatStorage] Migrating chats from old storage format...');
        try {
          const oldChats: any[] = JSON.parse(oldData);
          oldChats.forEach(chatData => {
            const chat = deserializeChat(chatData);
            this.saveChat(chat);
          });
          localStorage.removeItem('skhoot_chats');
          console.log(`[chatStorage] Successfully migrated ${oldChats.length} chats`);
        } catch (e) {
          console.error('[chatStorage] Migration failed:', e);
        }
      }

      const indexData = localStorage.getItem(INDEX_KEY);
      if (!indexData) return [];
      
      const index: ChatIndexEntry[] = JSON.parse(indexData);
      
      // Map index to full chat objects (lazily loaded)
      // or just return minimal chat objects for the sidebar
      return index.map(entry => {
        const chatData = localStorage.getItem(STORAGE_KEY_PREFIX + entry.id);
        if (chatData) {
          return deserializeChat(JSON.parse(chatData));
        }
        // Fallback if full data is missing but index exists
        return {
          id: entry.id,
          title: entry.title,
          messages: [],
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt)
        };
      }).sort((a: Chat, b: Chat) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  },

  // Get a single chat by ID
  getChat(id: string): Chat | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + id);
      if (!data) return null;
      return deserializeChat(JSON.parse(data));
    } catch (error) {
      console.error(`Error loading chat ${id}:`, error);
      return null;
    }
  },

  // Save a chat (create or update)
  saveChat(chat: Chat): void {
    try {
      // 1. Save individual chat data
      const serialized = serializeChat(chat);
      localStorage.setItem(STORAGE_KEY_PREFIX + chat.id, serialized);
      
      // 2. Update the index
      const indexData = localStorage.getItem(INDEX_KEY);
      let index: ChatIndexEntry[] = indexData ? JSON.parse(indexData) : [];
      
      const existingIndex = index.findIndex(e => e.id === chat.id);
      const entry: ChatIndexEntry = {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString()
      };
      
      if (existingIndex >= 0) {
        index[existingIndex] = entry;
      } else {
        index.unshift(entry);
      }
      
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('CRITICAL: LocalStorage quota exceeded. Attempting to emergency cleanup...');
        this.emergencyCleanup();
      }
      console.error('Error saving chat:', error);
    }
  },

  // Emergency cleanup: delete oldest chats until we have space
  emergencyCleanup(): void {
    try {
      const indexData = localStorage.getItem(INDEX_KEY);
      if (!indexData) return;
      
      let index: ChatIndexEntry[] = JSON.parse(indexData);
      if (index.length <= 1) return; // Keep at least one
      
      // Remove oldest 20% of chats
      const toRemoveCount = Math.max(1, Math.floor(index.length * 0.2));
      const removed = index.splice(index.length - toRemoveCount, toRemoveCount);
      
      removed.forEach(entry => {
        localStorage.removeItem(STORAGE_KEY_PREFIX + entry.id);
      });
      
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
      console.log(`Emergency cleanup removed ${removed.length} oldest chats`);
    } catch (e) {
      console.error('Emergency cleanup failed:', e);
    }
  },

  // Delete a chat
  deleteChat(id: string): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + id);
      
      const indexData = localStorage.getItem(INDEX_KEY);
      if (indexData) {
        let index: ChatIndexEntry[] = JSON.parse(indexData);
        index = index.filter(e => e.id !== id);
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  },

  // Create a new chat
  createChat(): Chat {
    const now = new Date();
    return {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  },

  // Generate title from first message
  generateTitle(messages: Message[]): string {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    const content = firstUserMessage.content;
    if (content.length <= 30) return content;
    return content.substring(0, 30) + '...';
  }
};
