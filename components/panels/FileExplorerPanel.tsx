/**
 * FileExplorerPanel - File explorer with tabs for Recent, Disk, Analysis
 * Uses terminal-style floating panel layout
 * Performance optimized with memo and useCallback
 */
import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { 
  Search, HardDrive, BarChart3, Trash2, 
  File, Folder, Clock, RefreshCw, Grid, List, MoreHorizontal,
  ExternalLink, Copy, Scissors, Info, Archive, FolderOpen, MessageSquarePlus, Image
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';
import { backendApi } from '../../services/backendApi';
import { fileOperations } from '../../services/fileOperations';
import { chatAttachmentService } from '../../services/chatAttachmentService';
import { recentFilesService, RecentFile, FileActionType } from '../../services/recentFilesService';
import { ImagesTab } from './ImagesTab';
import { useToast, ToastContainer } from '../ui/Toast';

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to get file color based on extension
const getFileColor = (fileName: string, isFolder: boolean): { bg: string; text: string } => {
  if (isFolder) {
    return { bg: '#8B5CF6', text: '#A78BFA' }; // Violet for folders
  }
  
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Color mapping based on file type
  const colorMap: Record<string, { bg: string; text: string }> = {
    // Images - Light purple/lavender
    'jpg': { bg: '#C4B5FD', text: '#A78BFA' },
    'jpeg': { bg: '#C4B5FD', text: '#A78BFA' },
    'png': { bg: '#C4B5FD', text: '#A78BFA' },
    'gif': { bg: '#C4B5FD', text: '#A78BFA' },
    'svg': { bg: '#C4B5FD', text: '#A78BFA' },
    'webp': { bg: '#C4B5FD', text: '#A78BFA' },
    
    // Documents - Green
    'md': { bg: '#86EFAC', text: '#4ADE80' },
    'txt': { bg: '#86EFAC', text: '#4ADE80' },
    'doc': { bg: '#86EFAC', text: '#4ADE80' },
    'docx': { bg: '#86EFAC', text: '#4ADE80' },
    'pdf': { bg: '#86EFAC', text: '#4ADE80' },
    
    // Code - Blue
    'js': { bg: '#93C5FD', text: '#60A5FA' },
    'ts': { bg: '#93C5FD', text: '#60A5FA' },
    'jsx': { bg: '#93C5FD', text: '#60A5FA' },
    'tsx': { bg: '#93C5FD', text: '#60A5FA' },
    'py': { bg: '#93C5FD', text: '#60A5FA' },
    'java': { bg: '#93C5FD', text: '#60A5FA' },
    
    // Data - Yellow
    'json': { bg: '#FDE047', text: '#FACC15' },
    'xml': { bg: '#FDE047', text: '#FACC15' },
    'csv': { bg: '#FDE047', text: '#FACC15' },
    'yaml': { bg: '#FDE047', text: '#FACC15' },
    'yml': { bg: '#FDE047', text: '#FACC15' },
  };
  
  return colorMap[ext] || { bg: '#8B5CF6', text: '#A78BFA' }; // Default violet
};

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

type TabId = 'recent' | 'images' | 'disk' | 'analysis'; // | 'cleanup';

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
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Memoize tabs to prevent recreation on every render - with conditional labels
  const tabs: SecondaryPanelTab[] = useMemo(() => [
    { id: 'recent', title: searchExpanded ? '' : 'Recent', icon: <Clock size={14} /> },
    { id: 'images', title: searchExpanded ? '' : 'Images', icon: <Image size={14} /> },
    { id: 'disk', title: searchExpanded ? '' : 'Disk', icon: <HardDrive size={14} /> },
    { id: 'analysis', title: searchExpanded ? '' : 'Analysis', icon: <BarChart3 size={14} /> },
    // { id: 'cleanup', title: searchExpanded ? '' : 'Cleanup', icon: <Trash2 size={14} /> },
  ], [searchExpanded]);

  useEffect(() => {
    if (isOpen && activeTab === 'recent') {
      loadRecentFiles();
    }
  }, [isOpen, activeTab]);

  // Listen for close event from bookmarks navigation
  useEffect(() => {
    const handleCloseEvent = () => {
      onClose();
    };
    window.addEventListener('close-file-explorer', handleCloseEvent as EventListener);
    return () => {
      window.removeEventListener('close-file-explorer', handleCloseEvent as EventListener);
    };
  }, [onClose]);

  const loadRecentFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const unified = await recentFilesService.getUnifiedRecents();
      setRecentFiles(unified);
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
      const files: RecentFile[] = (results.merged_results || []).map((r: any, i: number) => ({
        id: `search-${i}`,
        name: r.path.split(/[/\\]/).pop() || r.path,
        path: r.path,
        size: r.size,
        isDir: r.file_type === 'directory',
        action: 'SEARCHED',
        timestamp: Date.now()
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

  // Handle delete file from Recent Files Panel
  const handleDeleteFile = useCallback((fileId: string) => {
    setRecentFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const headerActions = useMemo(() => (
    <>
      {/* Left: Expandable Search Bar - pre-allocated space */}
      <div className="flex items-center mr-auto" style={{ width: searchExpanded ? '192px' : '32px', transition: 'width 200ms ease-in-out' }}>
        {searchExpanded ? (
          <div className="flex items-center gap-1 w-full px-2 py-1 rounded-xl bg-white/5">
            <Search size={12} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onBlur={() => {
                if (!searchQuery) setSearchExpanded(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSearchExpanded(false);
                } else if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[11px] font-jakarta outline-none placeholder:text-text-secondary min-w-0"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-1.5 rounded-xl transition-all hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
            title="Search"
          >
            <Search size={14} />
          </button>
        )}
      </div>

      {/* Right: View Mode Toggle - only show when search is not expanded */}
      {!searchExpanded && (activeTab === 'recent' || activeTab === 'images') && (
        <button onClick={toggleViewMode}
          className="p-1.5 rounded-xl transition-all hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }} title={viewMode === 'list' ? 'Grid View' : 'List View'}>
          {viewMode === 'list' ? <Grid size={14} /> : <List size={14} />}
        </button>
      )}

      {/* Refresh Button */}
      <button onClick={loadRecentFiles}
        className={`p-1.5 rounded-xl transition-all hover:bg-cyan-500/10 hover:text-cyan-500 ${isLoading ? 'animate-spin' : ''}`}
        style={{ color: 'var(--text-secondary)' }} title="Refresh">
        <RefreshCw size={14} />
      </button>
    </>
  ), [activeTab, viewMode, isLoading, searchExpanded, searchQuery, toggleViewMode, loadRecentFiles, handleSearchChange, handleSearch]);

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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'recent' && <RecentTab files={recentFiles} viewMode={viewMode} isLoading={isLoading} onDeleteFile={handleDeleteFile} />}
          {activeTab === 'images' && <ImagesTab viewMode={viewMode} isLoading={isLoading} />}
          {activeTab === 'disk' && <DiskTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {/* {activeTab === 'cleanup' && <CleanupTab />} */}
        </div>
      </div>
    </SecondaryPanel>
  );
});

const RecentTab = memo<{ 
  files: RecentFile[]; 
  viewMode: 'list' | 'grid'; 
  isLoading: boolean;
  onDeleteFile: (fileId: string) => void;
}>(({ files, viewMode, isLoading, onDeleteFile }) => {
  const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { toasts, showToast, closeToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group files by timeline
  const groups = useMemo(() => {
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const sections = [
      { label: 'Right Now', files: [] as RecentFile[] },
      { label: 'Active Session', files: [] as RecentFile[] },
      { label: 'Earlier Today', files: [] as RecentFile[] },
      { label: 'Recently', files: [] as RecentFile[] },
    ];

    files.forEach(f => {
      const diff = now - f.timestamp;
      if (diff < 5 * minute) sections[0].files.push(f);
      else if (diff < hour) sections[1].files.push(f);
      else if (diff < day) sections[2].files.push(f);
      else sections[3].files.push(f);
    });

    return sections.filter(s => s.files.length > 0);
  }, [files]);

  // Helper for action badges
  const ActionBadge = ({ action, label }: { action: FileActionType, label?: string }) => {
    const configs: Record<FileActionType, { color: string, icon: string }> = {
      CREATED: { color: 'bg-emerald-500/20 text-emerald-400', icon: '✨' },
      EDITED: { color: 'bg-amber-500/20 text-amber-400', icon: '📝' },
      OPENED: { color: 'bg-blue-500/20 text-blue-400', icon: '👁️' },
      SEARCHED: { color: 'bg-purple-500/20 text-purple-400', icon: '🔍' },
      DOWNLOADED: { color: 'bg-cyan-500/20 text-cyan-400', icon: '📥' },
      MENTIONED: { color: 'bg-white/10 text-text-secondary', icon: '💬' }
    };
    const config = configs[action];
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${config.color}`}>
        <span>{config.icon}</span>
        <span>{label || action}</span>
      </span>
    );
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);
  
  const handleOpenFolder = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await fileOperations.reveal(path);
    if (!success) {
      await navigator.clipboard.writeText(path);
      alert(`📋 Path copied!\n\n${path}`);
    }
  };
  
  const handleOpenFile = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fileActions.open(path);
  };
  
  const handleAddToChat = async (file: RecentFile, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const buttonId = `add-${file.id}`;
    setClickedButtons(prev => new Set(prev).add(buttonId));
    setTimeout(() => setClickedButtons(prev => {
      const next = new Set(prev);
      next.delete(buttonId);
      return next;
    }), 300);
    
    chatAttachmentService.addToChat({
      fileName: file.name,
      filePath: file.path,
      source: 'file_system'
    });
  };
  
  const handleMoreClick = (file: RecentFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === file.id ? null : file.id);
  };
  
  const handleCopyPath = async (file: RecentFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(null);
    const buttonId = `copy-${file.id}`;
    setClickedButtons(prev => new Set(prev).add(buttonId));
    setTimeout(() => setClickedButtons(prev => {
      const next = new Set(prev);
      next.delete(buttonId);
      return next;
    }), 300);
    
    try {
      await navigator.clipboard.writeText(file.path);
      showToast('Path copied', 'success', 2000);
    } catch (error) {
      showToast('Copy failed', 'error');
    }
  };
  
  const handleDeleteFile = (file: RecentFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(null);
    onDeleteFile(file.id);
    showToast('Removed from recent list', 'success', 2000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">
      <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }

  if (files.length === 0) {
    return <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Clock size={40} className="mb-4 opacity-20 text-text-primary" />
      <p className="text-sm font-bold text-text-primary mb-1">Your timeline is empty</p>
      <p className="text-xs text-text-secondary max-w-[200px]">
        Interact with files using the Agent or search to see them appear here magically.
      </p>
    </div>;
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">{group.label}</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className={viewMode === 'grid' ? "grid grid-cols-4 gap-3" : "space-y-1"}>
            {group.files.map(file => {
              const colors = getFileColor(file.name, file.isDir);
              
              if (viewMode === 'grid') {
                return (
                  <div key={file.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative group border border-white/5 hover:border-white/10">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={(e) => handleAddToChat(file, e)} className="p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all">
                        <MessageSquarePlus size={12} className="text-purple-400" />
                      </button>
                    </div>
                    
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-inner" style={{ backgroundColor: `${colors.bg}20` }}>
                      {file.isDir ? <Folder size={20} style={{ color: colors.text }} /> : <File size={20} style={{ color: colors.text }} />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold truncate text-text-primary cursor-pointer hover:underline" onClick={(e) => handleOpenFile(file.path, e)}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-1 min-w-0">
                        <ActionBadge action={file.action} label={file.sourceLabel} />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={file.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner" style={{ backgroundColor: `${colors.bg}10` }}>
                    {file.isDir ? <Folder size={16} style={{ color: colors.text }} /> : <File size={16} style={{ color: colors.text }} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold truncate text-text-primary cursor-pointer hover:underline" onClick={(e) => handleOpenFile(file.path, e)}>
                        {file.name}
                      </p>
                      <ActionBadge action={file.action} label={file.sourceLabel} />
                    </div>
                    <p className="text-[10px] truncate text-text-secondary/60 cursor-pointer hover:underline" onClick={(e) => handleOpenFolder(file.path, e)}>
                      {file.path}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleAddToChat(file, e)} className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400">
                      <MessageSquarePlus size={14} />
                    </button>
                    <button onClick={(e) => handleMoreClick(file, e)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
});
RecentTab.displayName = 'RecentTab';

const DiskTab = memo(() => {
  const [disks, setDisks] = useState<Array<{
    id: string;
    name: string;
    total: string;
    used: string;
    free: string;
    percent: number;
    type: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDiskInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await backendApi.getDiskInfo();
        const formattedDisks = response.disks.map(disk => ({
          id: disk.id,
          name: disk.name,
          total: formatBytes(disk.total_bytes),
          used: formatBytes(disk.used_bytes),
          free: formatBytes(disk.free_bytes),
          percent: Math.round(disk.usage_percentage),
          type: disk.disk_type,
        }));
        setDisks(formattedDisks);
      } catch (err) {
        console.error('Failed to load disk info:', err);
        setError('Failed to load disk information');
        // Fallback to mock data
        setDisks([
          { id: 'd1', name: 'Main Drive', total: '500 GB', used: '320 GB', free: '180 GB', percent: 64, type: 'internal' },
          { id: 'd2', name: 'Home', total: '500 GB', used: '280 GB', free: '220 GB', percent: 56, type: 'internal' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDiskInfo();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">
      <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }

  return <div className="space-y-3">
    {error && <p className="text-xs text-amber-400 mb-2">{error} (showing cached data)</p>}
    {disks.map((disk) => (
      <div key={disk.id} className="p-4 rounded-xl bg-white/5">
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
  const [categories, setCategories] = useState<Array<{
    name: string;
    size: string;
    count: number;
    color: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await backendApi.getStorageCategories({ max_depth: 4 });
        const formattedCategories = response.categories.map(cat => ({
          name: cat.name,
          size: cat.size_formatted,
          count: cat.file_count,
          color: cat.color,
        }));
        setCategories(formattedCategories);
      } catch (err) {
        console.error('Failed to load storage categories:', err);
        setError('Failed to analyze storage');
        // Fallback to mock data
        setCategories([
          { name: 'Documents', size: '45 GB', count: 1234, color: '#8b5cf6' },
          { name: 'Images', size: '32 GB', count: 5678, color: '#06b6d4' },
          { name: 'Videos', size: '120 GB', count: 234, color: '#f59e0b' },
          { name: 'Code', size: '28 GB', count: 9012, color: '#10b981' },
          { name: 'Other', size: '95 GB', count: 3456, color: '#6b7280' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">
      <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }

  return <div className="space-y-3">
    {error && <p className="text-xs text-amber-400 mb-2">{error} (showing cached data)</p>}
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

/* CLEANUP TAB - COMMENTED OUT
const CleanupTab = memo(() => {
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    name: string;
    path: string;
    size: string;
    description: string;
    safe: boolean;
  }>>([]);
  const [totalReclaimable, setTotalReclaimable] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await backendApi.getCleanupSuggestions();
        const formattedSuggestions = response.suggestions.map(s => ({
          id: s.id,
          name: s.name,
          path: s.path,
          size: s.size_formatted,
          description: s.description,
          safe: s.safety_level === 'safe',
        }));
        setSuggestions(formattedSuggestions);
        setTotalReclaimable(response.total_reclaimable_formatted);
      } catch (err) {
        console.error('Failed to load cleanup suggestions:', err);
        setError('Failed to analyze cleanup opportunities');
        // Fallback to mock data
        setSuggestions([
          { id: 'c1', name: 'Cache Files', path: '~/.cache', size: '2.4 GB', description: 'Temporary cache from applications', safe: true },
          { id: 'c2', name: 'Old Downloads', path: '~/Downloads', size: '1.8 GB', description: 'Files older than 30 days', safe: true },
          { id: 'c3', name: 'Duplicate Files', path: 'Various', size: '890 MB', description: '23 duplicate files found', safe: false },
          { id: 'c4', name: 'Large Files', path: 'Various', size: '5.2 GB', description: 'Files larger than 100MB', safe: false },
        ]);
        setTotalReclaimable('10.3 GB');
      } finally {
        setIsLoading(false);
      }
    };
    loadSuggestions();
  }, []);

  const handleClean = async (suggestion: typeof suggestions[0]) => {
    if (!confirm(`⚠️ Clean ${suggestion.name}?\n\nPath: ${suggestion.path}\nSize: ${suggestion.size}\n\n${suggestion.safe ? 'This is safe to remove.' : 'Please review before removing.'}`)) {
      return;
    }
    
    const success = await fileOperations.delete(suggestion.path);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      alert(`✅ Cleaned ${suggestion.name}`);
    } else {
      alert(`❌ Could not clean automatically. Path copied to clipboard.`);
      await navigator.clipboard.writeText(suggestion.path);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">
      <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }

  return <div className="space-y-2">
    {error && <p className="text-xs text-amber-400 mb-2">{error} (showing cached data)</p>}
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cleanup Suggestions</p>
      {totalReclaimable && (
        <span className="text-xs font-bold text-purple-400">~{totalReclaimable} reclaimable</span>
      )}
    </div>
    {suggestions.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Trash2 size={24} className="mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No cleanup suggestions</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Your system looks clean!</p>
      </div>
    ) : (
      suggestions.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
          {/* Status indicator dot *\/}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.safe ? 'bg-green-400' : 'bg-amber-400'}`} />
          
          {/* Info *\/}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.safe ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {item.safe ? 'Safe' : 'Review'}
              </span>
            </div>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
          </div>
          
          {/* Size + Action *\/}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-purple-400">{item.size}</span>
            <button 
              onClick={() => handleClean(item)}
              className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] font-bold hover:bg-purple-500/30 transition-all"
            >
              Clean
            </button>
          </div>
        </div>
      ))
    )}
  </div>;
});
CleanupTab.displayName = 'CleanupTab';
END CLEANUP TAB COMMENT */

FileExplorerPanel.displayName = 'FileExplorerPanel';

export default FileExplorerPanel;
