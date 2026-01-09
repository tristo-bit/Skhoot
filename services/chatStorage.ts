import { Chat, Message } from '../types';

const STORAGE_KEY = 'skhoot_chats';

// Helper to serialize dates for storage
const serializeChat = (chat: Chat): string => {
  return JSON.stringify({
    ...chat,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    messages: chat.messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString()
    }))
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
  // Get all chats
  getChats(): Chat[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map(deserializeChat).sort((a: Chat, b: Chat) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  },

  // Get a single chat by ID
  getChat(id: string): Chat | null {
    const chats = this.getChats();
    return chats.find(c => c.id === id) || null;
  },

  // Save a chat (create or update)
  saveChat(chat: Chat): void {
    try {
      const chats = this.getChats();
      const existingIndex = chats.findIndex(c => c.id === chat.id);
      
      if (existingIndex >= 0) {
        chats[existingIndex] = chat;
      } else {
        chats.unshift(chat);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.map(c => JSON.parse(serializeChat(c)))));
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  },

  // Delete a chat
  deleteChat(id: string): void {
    try {
      const chats = this.getChats().filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.map(c => JSON.parse(serializeChat(c)))));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  },

  // Create a new chat
  createChat(): Chat {
    const now = new Date();
    return {
      id: `chat_${Date.now()}`,
      title: 'New Search',
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  },

  // Generate title from first message
  generateTitle(messages: Message[]): string {
    if (messages.length === 0) return 'New Search';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Search';
    
    const content = firstUserMessage.content;
    if (content.length <= 30) return content;
    return content.substring(0, 30) + '...';
  }
};
