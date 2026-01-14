import React, { useState, useCallback, useRef } from 'react';
import { Search, FileText, Folder, X, Upload, Trash2, File } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { IconButton } from '../buttonFormat';
import { backendApi } from '../../services/backendApi';

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
  const [activeTab, setActiveTab] = useState<'attached' | 'search' | 'drop'>('attached');
  const dropZoneRef = useRef<HTMLDivElement>(null);

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
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      // For dropped files, we use the file name and a placeholder path
      // In a real implementation, you'd upload the file or get its actual path
      onAddFile({
        fileName: file.name,
        filePath: file.name, // Placeholder - would need actual path handling
        size: file.size,
        type: getFileExtension(file.name),
      });
    });
  }, [onAddFile]);

  // Check if file is already attached
  const isFileAttached = (fileName: string) => {
    return attachedFiles.some(f => f.fileName === fileName);
  };

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
          onClick={() => setActiveTab('attached')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'attached'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Attached ({attachedFiles.length})
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
        <button
          onClick={() => setActiveTab('drop')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'drop'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Drop Files
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
        {/* Attached Files Tab */}
        {activeTab === 'attached' && (
          <div className="space-y-2">
            {attachedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <FileText size={48} className="opacity-30 mb-4" />
                <p className="text-sm font-medium">No files attached</p>
                <p className="text-xs mt-1">Search or drop files to attach them</p>
              </div>
            ) : (
              attachedFiles.map((file) => (
                <div
                  key={file.fileName}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <FileText size={20} className="text-emerald-500" />
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
                    onClick={() => onRemoveFile(file.fileName)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
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

        {/* Drop Zone Tab */}
        {activeTab === 'drop' && (
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center h-[280px] rounded-2xl border-2 border-dashed transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-glass-border hover:border-emerald-500/50'
            }`}
          >
            <Upload size={48} className={`mb-4 ${isDragging ? 'text-emerald-500' : 'text-text-secondary opacity-50'}`} />
            <p className={`text-sm font-medium ${isDragging ? 'text-emerald-500' : 'text-text-secondary'}`}>
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-text-secondary mt-2">
              Files will be attached to your message
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FileAttachmentModal;
