import { MOCK_FILES, MOCK_MESSAGES } from '../constants';

// Demo event dispatcher
const dispatchDemoEvent = (type: string, data?: any) => {
  window.dispatchEvent(new CustomEvent('skhoot-demo', { detail: { type, data } }));
};

// Cleanup mock data - folders with sizes and removal info
export const MOCK_CLEANUP_ITEMS = [
  {
    id: 'c1',
    name: 'node_modules',
    path: '/Dev/old-project',
    size: '1.2 GB',
    type: 'folder' as const,
    canRemove: true,
    description: 'NPM dependencies for an old project. Can be reinstalled with npm install.',
    consequence: 'Safe to remove. Run npm install to restore if needed.',
    lastAccessed: '6 months ago',
  },
  {
    id: 'c2',
    name: 'Library/Caches',
    path: '~/Library/Caches',
    size: '4.8 GB',
    type: 'folder' as const,
    canRemove: true,
    description: 'Application cache files. Apps will recreate them as needed.',
    consequence: 'Safe to remove. Some apps may load slower initially.',
    lastAccessed: '1 day ago',
  },
  {
    id: 'c3',
    name: '.Trash',
    path: '~/.Trash',
    size: '2.1 GB',
    type: 'folder' as const,
    canRemove: true,
    description: 'Files in your trash bin waiting to be permanently deleted.',
    consequence: 'Permanent deletion. Files cannot be recovered.',
    lastAccessed: '3 days ago',
  },
  {
    id: 'c4',
    name: 'System',
    path: '/System',
    size: '12.4 GB',
    type: 'folder' as const,
    canRemove: false,
    description: 'Core macOS system files required for your computer to function.',
    consequence: 'DO NOT REMOVE. Will break your operating system.',
    lastAccessed: 'Always in use',
  },
  {
    id: 'c5',
    name: 'Downloads',
    path: '~/Downloads',
    size: '8.3 GB',
    type: 'folder' as const,
    canRemove: true,
    description: 'Downloaded files. Review before removing - may contain important documents.',
    consequence: 'Review contents first. Some files may be important.',
    lastAccessed: '2 hours ago',
  },
];

// Archived files mock data
export const MOCK_ARCHIVED_FILES = [
  {
    id: 'a1',
    name: 'project-2023-backup.zip',
    originalPath: '/Dev/project-2023',
    size: '450 MB',
    archivedDate: '2024-01-15',
    description: 'Full project backup including node_modules',
  },
  {
    id: 'a2',
    name: 'photos-vacation-2023.zip',
    originalPath: '/Pictures/Vacation',
    size: '2.1 GB',
    archivedDate: '2024-02-20',
    description: 'Vacation photos from summer 2023',
  },
];

// Action logs mock data
export const MOCK_ACTION_LOGS = [
  {
    id: 'l1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    action: 'File Search',
    query: 'invoice_2023',
    result: 'Found 3 files',
    status: 'success' as const,
  },
  {
    id: 'l2',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    action: 'Archive',
    query: 'project-2023-backup.zip',
    result: 'Archived 450 MB',
    status: 'success' as const,
  },
  {
    id: 'l3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    action: 'Cleanup',
    query: 'node_modules (old-project)',
    result: 'Removed 1.2 GB',
    status: 'success' as const,
  },
  {
    id: 'l4',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    action: 'Message Search',
    query: 'meeting notes',
    result: 'Found 5 messages',
    status: 'success' as const,
  },
  {
    id: 'l5',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    action: 'Disk Analysis',
    query: 'Full scan',
    result: 'Analyzed 256 GB',
    status: 'success' as const,
  },
];

// Connected apps mock data
export const MOCK_CONNECTED_APPS = [
  { id: 'app1', name: 'Slack', icon: '💬', connected: true, lastSync: '2 mins ago' },
  { id: 'app2', name: 'Discord', icon: '🎮', connected: true, lastSync: '5 mins ago' },
  { id: 'app3', name: 'iMessage', icon: '💭', connected: true, lastSync: '1 min ago' },
  { id: 'app4', name: 'Gmail', icon: '📧', connected: false, lastSync: null },
  { id: 'app5', name: 'Notion', icon: '📝', connected: false, lastSync: null },
];

// Demo functions
export const skhootDemo = {
  searchFiles: () => {
    console.log('🔍 Starting file search demo...');
    dispatchDemoEvent('search-files', { 
      query: 'invoice',
      results: MOCK_FILES.slice(0, 3)
    });
  },
  
  searchMessages: () => {
    console.log('💬 Starting message search demo...');
    dispatchDemoEvent('search-messages', {
      query: 'design',
      results: MOCK_MESSAGES
    });
  },
  
  analyzeDisk: () => {
    console.log('💾 Starting disk analysis demo...');
    dispatchDemoEvent('analyze-disk', {
      results: MOCK_FILES
    });
  },
  
  cleanup: () => {
    console.log('🧹 Starting cleanup demo...');
    dispatchDemoEvent('cleanup', {
      results: MOCK_CLEANUP_ITEMS
    });
  },
  
  showMarkdown: () => {
    console.log('📝 Showing markdown demo...');
    dispatchDemoEvent('show-markdown', {
      content: `# Markdown Demo

Here's what I can render:

## Text Formatting
- **Bold text** and *italic text*
- \`inline code\` for snippets
- ~~strikethrough~~ text

## Code Block
\`\`\`javascript
const greeting = "Hello, Skhoot!";
console.log(greeting);
\`\`\`

## Lists
1. First item
2. Second item
3. Third item

> This is a blockquote with some wisdom.

Check out [Skhoot](https://example.com) for more!`
    });
  },
  
  help: () => {
    console.log(`
🦉 Skhoot Demo Commands
━━━━━━━━━━━━━━━━━━━━━━━

Available commands:
  skhootDemo.searchFiles()    - Demo file search animation
  skhootDemo.searchMessages() - Demo message search animation  
  skhootDemo.analyzeDisk()    - Demo disk analysis animation
  skhootDemo.cleanup()        - Demo cleanup/space analysis
  skhootDemo.showMarkdown()   - Demo markdown rendering
  skhootDemo.help()           - Show this help message

Example:
  skhootDemo.searchFiles()
    `);
  }
};

// Initialize demo on window
export const initDemo = () => {
  (window as any).skhootDemo = skhootDemo;
  console.log('🦉 Skhoot Demo loaded! Type skhootDemo.help() for available commands.');
};
