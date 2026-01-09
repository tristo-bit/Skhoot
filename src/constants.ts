// Minimal constants for components that haven't been fully converted yet
export const COLORS = {
  lemonIcing: '#F9F1D2',
  nimbusCloud: '#D5D5D7',
  raindropsOnRoses: '#EAD8DE',
  cloudDancer: '#F0F0F0',
  iceMelt: '#D6E4F0',
  peachDust: '#F3DFD1',
  almostAqua: '#D1DBCB',
  orchidTint: '#E1D5E3',
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  accent: '#DDEBF4',
  fukuBrand: '#c0b7c9'
} as const;

export const THEME = {
  assistantBubble: COLORS.fukuBrand,
  userBubble: COLORS.iceMelt,
  sidebar: COLORS.cloudDancer,
  header: COLORS.nimbusCloud,
  background: COLORS.cloudDancer,
  input: COLORS.lemonIcing,
} as const;

export const GLASS_STYLES = {
  base: {
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  elevated: {
    backdropFilter: 'blur(20px)',
    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)',
  },
  subtle: {
    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.3)',
  },
} as const;
export const WELCOME_MESSAGES = [
  "Need help with something?",
  "Looking for a lost file?",
  "What can I find for you?",
  "Let's track down that file",
  "Search your files smarter",
  "Where did you save it?",
  "Find anything, instantly",
  "What are we hunting today?",
  "Lost something? I'll find it",
  "Your files, organized chaos"
] as const;

export const QUICK_ACTIONS = [
  { id: 'Files', color: '#D1DBCB', placeholder: 'Which file are you looking for?' },
  { id: 'Messages', color: '#EAD8DE', placeholder: 'Search in conversations for...' },
  { id: 'Space', color: '#F9F1D2', placeholder: 'Ask about disk usage...' },
  { id: 'Cleanup', color: '#E1D5E3', placeholder: 'Identify removable files...' },
] as const;

export const MOCK_FILES = [
  { id: '1', name: 'invoice_2023_oct.pdf', path: '/Documents/Work/Invoices', size: '1.2 MB', category: 'Work', safeToRemove: true, lastUsed: '2023-10-15' },
  { id: '2', name: 'draft_presentation_v2.pptx', path: '/Desktop/Drafts', size: '45 MB', category: 'Project', safeToRemove: true, lastUsed: '2023-11-20' },
  { id: '3', name: 'kernel_panic_log_2024.txt', path: '/System/Logs', size: '2 KB', category: 'System', safeToRemove: false, lastUsed: '2024-01-05' },
  { id: '4', name: 'large_cache_file.tmp', path: '/AppData/Local/Temp', size: '2.4 GB', category: 'Temp', safeToRemove: true, lastUsed: '2023-05-10' },
  { id: '5', name: 'family_photo_vacation.jpg', path: '/Pictures/2023', size: '5.6 MB', category: 'Personal', safeToRemove: false, lastUsed: '2023-12-25' },
  { id: '6', name: 'node_modules_old_project', path: '/Dev/archive/project-x', size: '850 MB', category: 'Dev', safeToRemove: true, lastUsed: '2022-8-12' }
] as const;

export const MOCK_MESSAGES = [
  { id: 'm1', app: 'Slack', user: 'Sarah', text: 'Hey, did you finish the Fuku UI design?', timestamp: '2 hours ago' },
  { id: 'm2', app: 'Discord', user: 'DevTeam', text: 'The build is failing on the log analyzer module.', timestamp: '1 day ago' },
  { id: 'm3', app: 'iMessage', user: 'Mom', text: 'Call me when you are free!', timestamp: '5 mins ago' }
] as const;
