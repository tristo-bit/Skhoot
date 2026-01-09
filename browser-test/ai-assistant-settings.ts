// AI Assistant Settings Configuration
// Following Skhoot codebase patterns from constants.ts and SettingsPanel.tsx

/*
// AI Assistant Configuration
export const AI_ASSISTANT_CONFIG = {
  // Core AI Settings
  enabled: true,
  model: 'gpt-4-turbo',
  responseStyle: 'conversational' as 'conversational' | 'technical' | 'concise',
  
  // Voice & Audio
  voiceEnabled: true,
  voiceSpeed: 1.0,
  voiceLanguage: 'en-US',
  
  // Behavior Settings
  proactiveMode: true,
  contextAwareness: true,
  learningMode: true,
  
  // Privacy & Data
  dataRetention: '30days' as '7days' | '30days' | '90days' | 'forever',
  shareAnalytics: false,
  localProcessing: true,
} as const;

// AI Assistant Settings Items (following SETTINGS_ITEMS pattern)
export const AI_ASSISTANT_SETTINGS = [
  { 
    icon: 'Brain', 
    label: 'AI Model', 
    color: COLORS.orchidTint,
    description: 'Choose AI model and capabilities'
  },
  { 
    icon: 'MessageSquare', 
    label: 'Response Style', 
    color: COLORS.almostAqua,
    description: 'How the AI communicates with you'
  },
  { 
    icon: 'Mic', 
    label: 'Voice Settings', 
    color: COLORS.raindropsOnRoses,
    description: 'Voice speed, language, and audio'
  },
  { 
    icon: 'Zap', 
    label: 'Behavior', 
    color: COLORS.lemonIcing,
    description: 'Proactive suggestions and learning'
  },
  { 
    icon: 'Shield', 
    label: 'Privacy', 
    color: COLORS.iceMelt,
    description: 'Data handling and retention'
  },
] as const;

// Mock AI Assistant Activity (following MOCK_ACTION_LOGS pattern)
export const MOCK_AI_ACTIVITY = [
  {
    id: 'ai1',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    action: 'Smart Suggestion',
    query: 'Suggested archiving old node_modules',
    result: 'User accepted - 1.2GB freed',
    status: 'success' as const,
  },
  {
    id: 'ai2', 
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    action: 'Context Analysis',
    query: 'Analyzed project structure',
    result: 'Found 3 optimization opportunities',
    status: 'success' as const,
  },
  {
    id: 'ai3',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    action: 'Voice Command',
    query: 'Find my presentation files',
    result: 'Located 5 PowerPoint files',
    status: 'success' as const,
  },
] as const;

// AI Assistant Capabilities (following MOCK_CONNECTED_APPS pattern)
export const AI_CAPABILITIES = [
  { id: 'cap1', name: 'File Analysis', icon: '📁', enabled: true, description: 'Smart file categorization' },
  { id: 'cap2', name: 'Voice Commands', icon: '🎤', enabled: true, description: 'Natural language processing' },
  { id: 'cap3', name: 'Proactive Cleanup', icon: '🧹', enabled: false, description: 'Automatic optimization suggestions' },
  { id: 'cap4', name: 'Context Learning', icon: '🧠', enabled: true, description: 'Learns from your patterns' },
  { id: 'cap5', name: 'Smart Search', icon: '🔍', enabled: true, description: 'Semantic file and message search' },
] as const;
*/