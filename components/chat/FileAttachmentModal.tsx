import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, FileText, Folder, X, Upload, Trash2, File, Image, FileCode, FileArchive, Music, Video } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { IconButton } from '../buttonFormat';
import { backendApi } from '../../services/backendApi';
import { listen } from '@tauri-apps/api/event';
import { isTauriApp } from '../../services/tauriDetection';

export interface AttachedFile {
  fileName: string;
  filePath: string;
  size?: number;
  type?: string;
}

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedFiles: AttachedFile[];
  onAddFile: (file: AttachedFile) => void;
  onRemoveFile: (fileName: string) => void;
  onClearAll: () => void;
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file extension
function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Get file type info (icon, color, label)
export function getFileTypeInfo(fileName: string) {
  const ext = getFileExtension(fileName);
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
    return {
      icon: Image,
      color: '#c0b7c9',
      bgColor: 'bg-[#c0b7c9]/20',
      borderColor: 'border-[#c0b7c9]/30',
      textColor: 'text-[#c0b7c9]',
      label: 'Image'
    };
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
    return {
      icon: Video,
      color: 'pink',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30',
      textColor: 'text-pink-500',
      label: 'Video'
    };
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
    return {
      icon: Music,
      color: 'blue',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-500',
      label: 'Audio'
    };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash'].includes(ext)) {
    return {
      icon: FileCode,
      color: 'cyan',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-cyan-500',
      label: 'Code'
    };
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return {
      icon: FileArchive,
      color: 'orange',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-500',
      label: 'Archive'
    };
  }
  
  // Documents (default)
  return {
    icon: FileText,
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500',
    label: 'Document'
  };
}

export const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  isOpen,
  onClose,
  attachedFiles,
  onAddFile,
  onRemoveFile,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AttachedFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'search'>('files');
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search for files
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await backendApi.aiFileSearch(searchQuery, {
        mode: 'hybrid',
        max_results: 20,
      });

      const files: AttachedFile[] = (results.merged_results || []).map((r: any) => {
        const pathParts = r.path.split(/[/\\]/);
        const fileName = pathParts[pathParts.length - 1] || r.path;
        return {
          fileName,
          filePath: r.path,
          size: r.size,
          type: r.file_type,
        };
      });

      setSearchResults(files);
    } catch (error) {
      console.error('File search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle search on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    console.log('[FileAttachment] Drag over detected');
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    console.log('[FileAttachment] Drag enter detected');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Simple approach: just set to false, dragEnter will set it back to true
    setIsDragging(false);
    console.log('[FileAttachment] Drag leave detected');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    console.log('[FileAttachment] Drop detected!', e.dataTransfer.files);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('[FileAttachment] Files to add:', files.length);
    
    files.forEach(file => {
      // Get the full path if available (works in Electron/Tauri)
      const filePath = (file as any).path || file.name;
      console.log('[FileAttachment] Adding file:', file.name, 'path:', filePath);
      onAddFile({
        fileName: file.name,
        filePath: filePath,
        size: file.size,
        type: getFileExtension(file.name),
      });
    });
  }, [onAddFile]);

  // Handle file input change (when user selects files via explorer)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      // Get the full path if available (works in Electron/Tauri)
      const filePath = (file as any).path || file.name;
      onAddFile({
        fileName: file.name,
        filePath: filePath,
        size: file.size,
        type: getFileExtension(file.name),
      });
    });
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  }, [onAddFile]);

  // Handle click to open file explorer
  const handleZoneClick = useCallback(async () => {
    if (isTauriApp()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const selected = await invoke<string[] | null>('pick_files');
        if (selected && selected.length > 0) {
          selected.forEach(filePath => {
            const pathParts = filePath.split(/[/\\]/);
            const fileName = pathParts[pathParts.length - 1];
            onAddFile({
              fileName,
              filePath,
              size: undefined,
              type: getFileExtension(fileName),
            });
          });
          return;
        }
      } catch (error) {
        console.error('Native file picker failed:', error);
      }
    }
    fileInputRef.current?.click();
  }, [onAddFile]);

  // Check if file is already attached
  const isFileAttached = (fileName: string) => {
    return attachedFiles.some(f => f.fileName === fileName);
  };

  // Listen for Tauri file drop events
  useEffect(() => {
    console.log('[FileAttachment] useEffect triggered', { isOpen, activeTab });
    
    if (!isOpen) {
      console.log('[FileAttachment] Skipping listener setup - modal closed');
      return;
    }

    let unlistenDrop: (() => void) | undefined;
    let unlistenHover: (() => void) | undefined;

    const setupListener = async () => {
      try {
        console.log('[FileAttachment] Setting up Tauri listeners...');
        
        // Listen for file drop
        unlistenDrop = await listen<any>('tauri://drag-drop', (event) => {
          console.log('[FileAttachment] ✅ Tauri drag-drop detected!', event.payload);
          
          let paths: string[] = [];
          
          // Tauri v2 payload: { paths: string[], position: { x: number, y: number } }
          // Tauri v1 payload: string[]
          if (Array.isArray(event.payload)) {
            paths = event.payload;
          } else if (event.payload && typeof event.payload === 'object' && Array.isArray(event.payload.paths)) {
            paths = event.payload.paths;
          }

          if (paths.length > 0) {
            paths.forEach(filePath => {
              const pathParts = filePath.split(/[/\\]/);
              const fileName = pathParts[pathParts.length - 1] || 'Unknown';
              
              console.log('[FileAttachment] Adding file from Tauri:', fileName, filePath);
              
              onAddFile({
                fileName,
                filePath,
                size: undefined,
                type: getFileExtension(fileName),
              });
            });
          }
          
          setIsDragging(false);
        });
        
        // Listen for drag hover
        unlistenHover = await listen('tauri://drag', () => {
          console.log('[FileAttachment] ✅ Tauri drag hover detected');
          setIsDragging(true);
        });

        // Listen for drag leave
        const unlistenLeave = await listen('tauri://drag-leave', () => {
          console.log('[FileAttachment] ✅ Tauri drag leave detected');
          setIsDragging(false);
        });
        
        console.log('[FileAttachment] ✅ Tauri file drop listeners setup successfully');
        
        return () => {
          unlistenDrop?.();
          unlistenHover?.();
          unlistenLeave();
        };
      } catch (error) {
        console.error('[FileAttachment] ❌ Failed to setup Tauri listeners:', error);
      }
    };

    const cleanupFn = setupListener();

    return () => {
      console.log('[FileAttachment] Cleaning up listeners...');
      cleanupFn.then(unlisten => unlisten?.());
      console.log('[FileAttachment] ✅ Tauri file drop listeners cleaned up');
    };
  }, [isOpen, activeTab, onAddFile]);

  if (!isOpen) return null;

  return (
    <Modal
      title="Attach Files"
      onClose={onClose}
      panelClassName="w-[600px] max-w-[90vw] max-h-[80vh]"
      headerClassName="px-6 py-4 border-b border-glass-border"
      bodyClassName="p-0"
      footer={
        attachedFiles.length > 0 ? (
          <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border">
            <span className="text-sm text-text-secondary font-jakarta">
              {attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} attached
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-glass-border">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Files ({attachedFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Search Files
        </button>
      </div>

      {/* Tab Content */}
      <div 
        className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Files Tab - Combined Attached + Drop Zone */}
        {activeTab === 'files' && (
          <>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              accept="*/*"
            />
            
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleZoneClick}
              className={`space-y-2 rounded-2xl border-2 border-dashed p-4 transition-colors cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-glass-border hover:border-emerald-500/30'
              }`}
            >
              {attachedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                  <Upload size={48} className={`mb-4 ${isDragging ? 'text-emerald-500' : 'opacity-30'}`} />
                  <p className={`text-sm font-medium ${isDragging ? 'text-emerald-500' : ''}`}>
                    {isDragging ? 'Drop files here' : 'No files attached'}
                  </p>
                  <p className="text-xs mt-1">
                    {isDragging ? 'Release to attach' : 'Click to browse or drag & drop files here'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Drop hint when dragging over files */}
                  {isDragging && (
                    <div className="flex items-center justify-center py-4 mb-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                      <Upload size={20} className="text-emerald-500 mr-2" />
                      <p className="text-sm font-medium text-emerald-500">Drop to add more files</p>
                    </div>
                  )}
                  
                  {/* Attached Files List */}
                  {attachedFiles.map((file) => {
                    const fileInfo = getFileTypeInfo(file.fileName);
                    const FileIcon = fileInfo.icon;
                    
                    return (
                      <div
                        key={file.fileName}
                        className={`flex items-center gap-3 p-3 rounded-xl ${fileInfo.bgColor} border ${fileInfo.borderColor}`}
                        onClick={(e) => e.stopPropagation()} // Prevent zone click when clicking on file
                      >
                        <div className={`w-10 h-10 rounded-lg ${fileInfo.bgColor} flex items-center justify-center`}>
                          <FileIcon size={20} className={fileInfo.textColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-text-secondary truncate">
                            {file.filePath}
                            {file.size && ` • ${formatFileSize(file.size)}`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFile(file.fileName);
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search for files..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-glass-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            <div className="space-y-2">
              {searchResults.length === 0 && !isSearching && searchQuery && (
                <div className="text-center py-8 text-text-secondary">
                  <p className="text-sm">No files found for "{searchQuery}"</p>
                </div>
              )}
              {searchResults.map((file) => {
                const attached = isFileAttached(file.fileName);
                return (
                  <div
                    key={file.filePath}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      attached
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-white/5 border-glass-border hover:border-emerald-500/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      attached ? 'bg-emerald-500/20' : 'bg-white/10'
                    }`}>
                      <File size={20} className={attached ? 'text-emerald-500' : 'text-text-secondary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {file.filePath}
                        {file.size && ` • ${formatFileSize(file.size)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => attached ? onRemoveFile(file.fileName) : onAddFile(file)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        attached
                          ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                      }`}
                    >
                      {attached ? 'Remove' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FileAttachmentModal;
