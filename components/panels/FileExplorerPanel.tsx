/**
 * FileExplorerPanel - File explorer with tabs for Recent, Disk, Analysis, Cleanup
 * Uses terminal-style floating panel layout
 * Performance optimized with memo and useCallback
 */
import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, HardDrive, BarChart3, Trash2, 
  File, Folder, Clock, RefreshCw, Grid, List, MoreHorizontal,
  ExternalLink, Copy, Scissors, Info, Archive, FolderOpen, MessageSquarePlus
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';
import { backendApi } from '../../services/backendApi';
import { fileOperations } from '../../services/fileOperations';

// File action handlers - using fileOperations service
const fileActions = {
  open: async (filePath: string): Promise<boolean> => {
    const success = await fileOperations.open(filePath);
    if (!success) {
      await navigator.clipboard.writeText(filePath);
      alert(`📋 Path copied!\n\n${filePath}\n\nCould not open file automatically.`);
    }
    return success;
  },
  
  copy: async (filePath: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(filePath);
      return true;
    } catch {
      return false;
    }
  },
  
  delete: async (filePath: string): Promise<boolean> => {
    if (!confirm(`⚠️ Delete this file?\n\n${filePath}\n\nThis cannot be undone.`)) {
      return false;
    }
    
    const success = await fileOperations.delete(filePath);
    if (success) {
      alert('✅ File deleted');
    } else {
      await navigator.clipboard.writeText(filePath);
      alert(`❌ Could not delete automatically.\n\nPath copied - delete manually.`);
    }
    return success;
  },
  
  properties: async (filePath: string): Promise<boolean> => {
    const success = await fileOperations.showProperties(filePath);
    if (!success) {
      // Fallback: show basic info
      const info = await fileOperations.getInfo(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
      const extension = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : 'Folder';
      
      if (info) {
        alert(`📄 File Properties\n\nName: ${fileName}\nType: ${extension}\nSize: ${info.size || 'Unknown'}\nModified: ${info.modified || 'Unknown'}\n\nPath: ${filePath}`);
      } else {
        alert(`📄 File Properties\n\nName: ${fileName}\nType: ${extension}\nPath: ${filePath}`);
      }
    }
    return true;
  },
  
  compress: async (filePath: string): Promise<boolean> => {
    const result = await fileOperations.compress(filePath);
    if (result.success) {
      alert(`✅ Compressed!\n\nSaved to: ${result.zipPath || filePath + '.zip'}`);
    } else {
      alert(`❌ Compression not available.\n\nUse Windows Explorer: Right-click → Send to → Compressed folder`);
    }
    return result.success;
  },
  
  openWith: async (filePath: string): Promise<boolean> => {
    const success = await fileOperations.openWith(filePath);
    if (!success) {
      await navigator.clipboard.writeText(filePath);
      alert(`📋 Path copied!\n\n${filePath}\n\nIn File Explorer:\nRight-click → "Open with" → Choose app`);
    }
    return success;
  },
  
  revealInExplorer: async (filePath: string): Promise<boolean> => {
    return await fileOperations.reveal(filePath);
  },
};

// File context menu dropdown component - rendered as portal to avoid overflow issues
const FileContextMenu: React.FC<{
  file: FileItem;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}> = ({ file, isOpen, onClose, position }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const menuItems = [
    { icon: <MessageSquarePlus size={14} />, label: 'Add to chat', action: async () => { 
      // Add file reference to chat via custom event
      const fileName = file.path.split(/[/\\]/).pop() || file.path;
      
      // Dispatch custom event for PromptArea to handle
      const event = new CustomEvent('add-file-reference', {
        detail: { fileName, filePath: file.path }
      });
      window.dispatchEvent(event);
      
      // Focus the textarea
      const textarea = document.querySelector('textarea.file-mention-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
      
      // Visual feedback
      console.log(`[FileExplorer] Dispatched add-file-reference: @${fileName} -> ${file.path}`);
    }, highlight: true },
    { divider: true },
    { icon: <ExternalLink size={14} />, label: 'Open', action: async () => { await fileActions.open(file.path); } },
    { icon: <FolderOpen size={14} />, label: 'Show in folder', action: async () => { await fileActions.revealInExplorer(file.path); } },
    { divider: true },
    { icon: <Copy size={14} />, label: 'Copy path', action: async () => { 
      const success = await fileActions.copy(file.path);
      if (success) {
        alert('✅ Path copied to clipboard!');
      }
    }},
    { icon: <Scissors size={14} />, label: 'Cut (copy path)', action: async () => { 
      await fileActions.copy(file.path);
      alert('✅ Path copied (cut)');
    }},
    { divider: true },
    { icon: <Archive size={14} />, label: 'Compress to ZIP', action: async () => { await fileActions.compress(file.path); } },
    { icon: <ExternalLink size={14} />, label: 'Open with...', action: async () => { await fileActions.openWith(file.path); } },
    { divider: true },
    { icon: <Info size={14} />, label: 'Properties', action: async () => { await fileActions.properties(file.path); } },
    { icon: <Trash2 size={14} />, label: 'Delete', action: async () => { await fileActions.delete(file.path); }, danger: true },
  ];
  
  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[99999] min-w-[180px] py-1.5 rounded-xl backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        top: Math.min(position.y, window.innerHeight - 320),
        left: Math.min(position.x, window.innerWidth - 200),
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {menuItems.map((item, i) => 
        item.divider ? (
          <div key={i} className="my-1 border-t border-white/10" />
        ) : (
          <button
            key={i}
            onClick={async (e) => {
              e.stopPropagation();
              await item.action?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-all hover:bg-white/10 ${
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 
              (item as any).highlight ? 'bg-purple-500/10 hover:bg-purple-500/20' : ''
            }`}
            style={{ color: item.danger ? undefined : (item as any).highlight ? '#a78bfa' : 'var(--text-primary)' }}
          >
            <span className={item.danger ? 'text-red-400' : (item as any).highlight ? 'text-purple-400' : 'text-text-secondary'}>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
  
  // Render as portal to avoid overflow issues
  return createPortal(menu, document.body);
};

type TabId = 'recent' | 'disk' | 'analysis' | 'cleanup';

interface FileItem {
  id: string;
  name: string;
  path: string;
  size: string;
  type: 'file' | 'folder';
  modified: string;
}

interface FileExplorerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = memo(({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);

  // Memoize tabs to prevent recreation on every render
  const tabs: SecondaryPanelTab[] = useMemo(() => [
    { id: 'recent', title: 'Recent', icon: <Clock size={14} /> },
    { id: 'disk', title: 'Disk', icon: <HardDrive size={14} /> },
    { id: 'analysis', title: 'Analysis', icon: <BarChart3 size={14} /> },
    { id: 'cleanup', title: 'Cleanup', icon: <Trash2 size={14} /> },
  ], []);

  useEffect(() => {
    if (isOpen && activeTab === 'recent') {
      loadRecentFiles();
    }
  }, [isOpen, activeTab]);

  const loadRecentFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await backendApi.aiFileSearch('recent files', { mode: 'hybrid', max_results: 20 });
      const files: FileItem[] = (results.merged_results || []).slice(0, 15).map((r: any, i: number) => ({
        id: `file-${i}`,
        name: r.path.split(/[/\\]/).pop() || r.path,
        path: r.path,
        size: r.size ? formatSize(r.size) : 'Unknown',
        type: r.file_type === 'directory' ? 'folder' : 'file',
        modified: r.modified || 'Unknown',
      }));
      setRecentFiles(files);
    } catch (error) {
      console.error('Failed to load recent files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const results = await backendApi.aiFileSearch(searchQuery, { mode: 'hybrid', max_results: 30 });
      const files: FileItem[] = (results.merged_results || []).map((r: any, i: number) => ({
        id: `search-${i}`,
        name: r.path.split(/[/\\]/).pop() || r.path,
        path: r.path,
        size: r.size ? formatSize(r.size) : 'Unknown',
        type: r.file_type === 'directory' ? 'folder' : 'file',
        modified: r.modified || 'Unknown',
      }));
      setRecentFiles(files);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Memoize toggle view mode callback
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'grid' : 'list');
  }, []);

  // Memoize tab change callback
  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id as TabId);
  }, []);

  // Memoize search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoize search key handler
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const headerActions = useMemo(() => (
    <>
      {activeTab === 'recent' && (
        <button onClick={toggleViewMode}
          className="p-1.5 rounded-xl transition-all hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }} title={viewMode === 'list' ? 'Grid View' : 'List View'}>
          {viewMode === 'list' ? <Grid size={14} /> : <List size={14} />}
        </button>
      )}
      <button onClick={loadRecentFiles}
        className={`p-1.5 rounded-xl transition-all hover:bg-cyan-500/10 hover:text-cyan-500 ${isLoading ? 'animate-spin' : ''}`}
        style={{ color: 'var(--text-secondary)' }} title="Refresh">
        <RefreshCw size={14} />
      </button>
    </>
  ), [activeTab, viewMode, isLoading, toggleViewMode, loadRecentFiles]);

  return (
    <SecondaryPanel 
      isOpen={isOpen} 
      onClose={onClose} 
      tabs={tabs} 
      activeTabId={activeTab}
      onTabChange={handleTabChange} 
      headerActions={headerActions}
      storageKey="skhoot-file-explorer-height" 
      defaultHeight={400}
      minHeight={250}
      animationName="fileExplorerSlideUp"
    >
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
            <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            <input type="text" value={searchQuery} onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown} placeholder="Search files..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-jakarta"
              style={{ color: 'var(--text-primary)' }} />
            {searchQuery && (
              <button onClick={handleSearch} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium">
                Search
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'recent' && <RecentTab files={recentFiles} viewMode={viewMode} isLoading={isLoading} />}
          {activeTab === 'disk' && <DiskTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'cleanup' && <CleanupTab />}
        </div>
      </div>
    </SecondaryPanel>
  );
});

const RecentTab = memo<{ files: FileItem[]; viewMode: 'list' | 'grid'; isLoading: boolean }>(({ files, viewMode, isLoading }) => {
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; position: { x: number; y: number } } | null>(null);
  
  const handleOpenFolder = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await fileOperations.reveal(path);
    if (!success) {
      await navigator.clipboard.writeText(path);
      alert(`📋 Path copied!\n\n${path}`);
    }
  };
  
  const handleContextMenu = (file: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ file, position: { x: e.clientX, y: e.clientY } });
  };
  
  const handleMoreClick = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ file, position: { x: rect.left, y: rect.bottom + 4 } });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">
      <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }
  if (files.length === 0) {
    return <div className="flex flex-col items-center justify-center h-full text-center">
      <Clock size={32} className="mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
      <p className="text-sm font-jakarta" style={{ color: 'var(--text-secondary)' }}>No recent files</p>
    </div>;
  }
  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-4 gap-3">
          {files.map(file => (
            <div 
              key={file.id} 
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer relative group"
              onContextMenu={(e) => handleContextMenu(file, e)}
            >
              <button
                onClick={(e) => handleMoreClick(file, e)}
                className="absolute top-2 right-2 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={12} className="text-text-secondary" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                {file.type === 'folder' ? <Folder size={20} className="text-purple-400" /> : <File size={20} className="text-purple-400" />}
              </div>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
              <p 
                className="text-[10px] mt-1 cursor-pointer hover:underline hover:opacity-80 transition-opacity truncate" 
                style={{ color: 'var(--text-secondary)' }}
                onClick={(e) => handleOpenFolder(file.path, e)}
                title="Click to open folder"
              >
                {file.size}
              </p>
            </div>
          ))}
        </div>
        {contextMenu && (
          <FileContextMenu
            file={contextMenu.file}
            isOpen={true}
            onClose={() => setContextMenu(null)}
            position={contextMenu.position}
          />
        )}
      </>
    );
  }
  return (
    <>
      <div className="space-y-1">
        {files.map(file => (
          <div 
            key={file.id} 
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
            onContextMenu={(e) => handleContextMenu(file, e)}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              {file.type === 'folder' ? <Folder size={16} className="text-purple-400" /> : <File size={16} className="text-purple-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
              <p 
                className="text-xs truncate cursor-pointer hover:underline hover:opacity-80 transition-opacity" 
                style={{ color: 'var(--text-secondary)' }}
                onClick={(e) => handleOpenFolder(file.path, e)}
                title="Click to open folder"
              >
                {file.path}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{file.size}</p>
            </div>
            <button 
              onClick={(e) => handleMoreClick(file, e)}
              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-all opacity-60 group-hover:opacity-100"
              title="More actions"
            >
              <MoreHorizontal size={14} className="text-purple-400" />
            </button>
          </div>
        ))}
      </div>
      {contextMenu && (
        <FileContextMenu
          file={contextMenu.file}
          isOpen={true}
          onClose={() => setContextMenu(null)}
          position={contextMenu.position}
        />
      )}
    </>
  );
});
RecentTab.displayName = 'RecentTab';

const DiskTab = memo(() => {
  const disks = [
    { name: 'Main Drive', total: '500 GB', used: '320 GB', free: '180 GB', percent: 64 },
    { name: 'Home', total: '500 GB', used: '280 GB', free: '220 GB', percent: 56 },
  ];
  return <div className="space-y-3">
    {disks.map((disk, i) => (
      <div key={i} className="p-4 rounded-xl bg-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <HardDrive size={18} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold font-jakarta" style={{ color: 'var(--text-primary)' }}>{disk.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{disk.free} free of {disk.total}</p>
          </div>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ 
            width: `${disk.percent}%`,
            backgroundColor: disk.percent > 85 ? '#ef4444' : disk.percent > 60 ? '#f59e0b' : '#22c55e'
          }} />
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{disk.used} used ({disk.percent}%)</p>
      </div>
    ))}
  </div>;
});
DiskTab.displayName = 'DiskTab';

const AnalysisTab = memo(() => {
  const categories = [
    { name: 'Documents', size: '45 GB', count: 1234, color: '#8b5cf6' },
    { name: 'Images', size: '32 GB', count: 5678, color: '#06b6d4' },
    { name: 'Videos', size: '120 GB', count: 234, color: '#f59e0b' },
    { name: 'Code', size: '28 GB', count: 9012, color: '#10b981' },
    { name: 'Other', size: '95 GB', count: 3456, color: '#6b7280' },
  ];
  return <div className="space-y-3">
    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Storage by Category</p>
    {categories.map((cat, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat.count.toLocaleString()} files</p>
        </div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{cat.size}</p>
      </div>
    ))}
  </div>;
});
AnalysisTab.displayName = 'AnalysisTab';

const CleanupTab = memo(() => {
  const suggestions = [
    { name: 'Cache Files', size: '2.4 GB', description: 'Temporary cache from applications', safe: true },
    { name: 'Old Downloads', size: '1.8 GB', description: 'Files older than 30 days', safe: true },
    { name: 'Duplicate Files', size: '890 MB', description: '23 duplicate files found', safe: false },
    { name: 'Large Files', size: '5.2 GB', description: 'Files larger than 100MB', safe: false },
  ];
  return <div className="space-y-2">
    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Cleanup Suggestions</p>
    {suggestions.map((item, i) => (
      <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
        {/* Status indicator dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.safe ? 'bg-green-400' : 'bg-amber-400'}`} />
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.safe ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {item.safe ? 'Safe' : 'Review'}
            </span>
          </div>
          <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
        </div>
        
        {/* Size + Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-purple-400">{item.size}</span>
          <button className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] font-bold hover:bg-purple-500/30 transition-all">
            Clean
          </button>
        </div>
      </div>
    ))}
  </div>;
});
CleanupTab.displayName = 'CleanupTab';

FileExplorerPanel.displayName = 'FileExplorerPanel';

export default FileExplorerPanel;
