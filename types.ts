
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'file_list' | 'message_list' | 'analysis' | 'disk_usage';
  data?: any;
  timestamp: Date;
}

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: string;
  category: string;
  safeToRemove: boolean;
  lastUsed: string;
}

export interface ConversationMessage {
  id: string;
  app: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface SearchResult {
  files?: FileInfo[];
  messages?: ConversationMessage[];
  analysis?: string;
}
