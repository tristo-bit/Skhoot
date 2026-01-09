
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'file_list' | 'message_list' | 'analysis' | 'disk_usage' | 'cleanup';
  data?: any;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
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

export interface DiskInfo {
  id: string;
  name: string;
  totalSpace: number; // in GB
  usedSpace: number; // in GB
  availableSpace: number; // in GB
  usagePercentage: number;
  type: 'internal' | 'external' | 'network';
}

export interface CleanupItem {
  id: string;
  name: string;
  path: string;
  size: string;
  type: 'folder' | 'file';
  canRemove: boolean;
  description: string;
  consequence: string;
  lastAccessed: string;
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

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  provider: 'email' | 'google' | 'microsoft' | 'apple';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
