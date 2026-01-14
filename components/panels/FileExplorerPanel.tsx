/**
 * FileExplorerPanel - File explorer with tabs for Recent, Disk, Analysis, Cleanup
 * Uses terminal-style floating panel layout
 */
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Search, HardDrive, BarChart3, Trash2, 
  File, Folder, Clock, RefreshCw, Grid, List, MoreHorizontal
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';
import { backendApi } from '../../services/backendApi';

// Helper to open parent folder and select the file
const openFolder = async (filePath: string): Promise<boolean> => {
  // Normalize path for Windows (use backslashes)
  const normalizedPath = filePath.replace(/\//g, '\\');
  
  // Try backend API first - it can select the file in the folder
  try {
    const response = await fetch('http://localhost:3001/api/v1/files/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normalizedPath }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
  } catch {}
  
  // Try Tauri shell plugin with reveal command
  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      await Command.create('explorer', [`/select,${normalizedPath}`]).execute();
      return true;
    } else if (platform.includes('mac')) {
      await Command.create('open', ['-R', filePath]).execute();
      return true;
    } else {
      const lastSlash = filePath.lastIndexOf('/');
      const parentDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
      await Command.create('xdg-open', [parentDir]).execute();
      return true;
    }
  } catch {}
  
  return false;
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

export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);

  const tabs: SecondaryPanelTab[] = [
    { id: 'recent', title: 'Recent', icon: <Clock size={14} /> },
    { id: 'disk', title: 'Disk', icon: <HardDrive size={14} /> },
    { id: 'analysis', title: 'Analysis', icon: <BarChart3 size={14} /> },
    { id: 'cleanup', title: 'Cleanup', icon: <Trash2 size={14} /> },
  ];

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

  const headerActions = (
    <>
      <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        className="p-1.5 rounded-xl transition-all hover:bg-white/10"
        style={{ color: 'var(--text-secondary)' }} title={viewMode === 'list' ? 'Grid View' : 'List View'}>
        {viewMode === 'list' ? <Grid size={14} /> : <List size={14} />}
      </button>
      <button onClick={loadRecentFiles}
        className={`p-1.5 rounded-xl transition-all hover:bg-cyan-500/10 hover:text-cyan-500 ${isLoading ? 'animate-spin' : ''}`}
        style={{ color: 'var(--text-secondary)' }} title="Refresh">
        <RefreshCw size={14} />
      </button>
    </>
  );

  return (
    <SecondaryPanel 
      isOpen={isOpen} 
      onClose={onClose} 
      tabs={tabs} 
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)} 
      headerActions={headerActions}
      storageKey="skhoot-file-explorer-height" 
      defaultHeight={350}
      animationName="fileExplorerSlideUp"
    >
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
            <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search files..."
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
};

const RecentTab: React.FC<{ files: FileItem[]; viewMode: 'list' | 'grid'; isLoading: boolean }> = ({ files, viewMode, isLoading }) => {
  const handleOpenFolder = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await openFolder(path);
    if (!success) {
      await navigator.clipboard.writeText(path);
      alert(`📋 Path copied!\n\n${path}`);
    }
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
    return <div className="grid grid-cols-4 gap-3">
      {files.map(file => (
        <div key={file.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
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
    </div>;
  }
  return <div className="space-y-1">
    {files.map(file => (
      <div key={file.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
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
        <button className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 transition-all">
          <MoreHorizontal size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    ))}
  </div>;
};

const DiskTab: React.FC = () => {
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
            backgroundColor: disk.percent > 80 ? '#ef4444' : disk.percent > 60 ? '#f59e0b' : '#8b5cf6'
          }} />
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{disk.used} used ({disk.percent}%)</p>
      </div>
    ))}
  </div>;
};

const AnalysisTab: React.FC = () => {
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
};

const CleanupTab: React.FC = () => {
  const suggestions = [
    { name: 'Cache Files', size: '2.4 GB', description: 'Temporary cache from applications', safe: true },
    { name: 'Old Downloads', size: '1.8 GB', description: 'Files older than 30 days', safe: true },
    { name: 'Duplicate Files', size: '890 MB', description: '23 duplicate files found', safe: false },
    { name: 'Large Files', size: '5.2 GB', description: 'Files larger than 100MB', safe: false },
  ];
  return <div className="space-y-3">
    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Cleanup Suggestions</p>
    {suggestions.map((item, i) => (
      <div key={i} className="p-3 rounded-xl bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.safe ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {item.safe ? 'Safe' : 'Review'}
          </span>
        </div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-purple-400">{item.size}</p>
          <button className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-all">
            Clean
          </button>
        </div>
      </div>
    ))}
  </div>;
};

export default FileExplorerPanel;
