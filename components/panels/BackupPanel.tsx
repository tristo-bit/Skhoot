import React, { memo, useState } from 'react';
import { Archive, Brain, Bookmark, Loader2 } from 'lucide-react';
import { Modal, FileCard, type FileCardFile } from '../ui';
import { backupService, type BackupFile } from '../../services/backupService';
import { TabButton } from '../buttonFormat';
import { BookmarksTab } from './bookmarks/BookmarksTab';
import { MemoriesTab } from './memories/MemoriesTab';

interface FilesPanelProps {
  onClose: () => void;
}

type Tab = 'memories' | 'bookmarks' | 'apps' | 'archive';

const FilesPanel: React.FC<FilesPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('memories');
  const [archivedFiles, setArchivedFiles] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringFiles, setRestoringFiles] = useState<Set<string>>(new Set());

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'memories', label: 'Memories', icon: <Brain size={14} /> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={14} /> },
    // Archive tab commented out - UI update
    // { id: 'archive', label: 'Archive', icon: <Archive size={14} /> },
  ];

  // Load backups when tab changes to archive
  React.useEffect(() => {
    if (activeTab === 'archive') {
      loadBackups();
    }
  }, [activeTab]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const files = await backupService.list();
      setArchivedFiles(files);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteArchive = async (archiveId: string) => {
    if (await backupService.delete(archiveId)) {
      setArchivedFiles(files => files.filter(f => f.id !== archiveId));
    }
  };

  const handleRestore = async (fileId: string) => {
    setRestoringFiles(prev => new Set(prev).add(fileId));
    try {
      if (await backupService.restore(fileId)) {
        await loadBackups(); 
      }
    } catch (error) {
      console.error('Failed to restore file:', error);
    } finally {
      setRestoringFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  return (
    <Modal
      title="Data"
      onClose={onClose}
      panelClassName="files-panel"
      headerClassName="files-panel-header"
      bodyClassName="files-panel-body-wrapper"
      closeAriaLabel="Close data panel"
    >
      {/* Tabs Section - Fixed at top */}
      <div className="files-panel-tabs-container flex-shrink-0 border-b border-glass-border">
        <div className="flex gap-2 px-6 py-3 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onTabClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="files-panel-content flex-1 overflow-y-auto no-scrollbar px-6 py-4">
        {activeTab === 'memories' && <MemoriesTab />}
        {activeTab === 'bookmarks' && <BookmarksTab viewMode="list" searchQuery="" />}
        {/* Archive tab content commented out - UI update */}
        {/* {activeTab === 'archive' && (
          <ArchiveTab 
            files={archivedFiles} 
            onDelete={deleteArchive} 
            onRestore={handleRestore}
            restoringFiles={restoringFiles}
            isLoading={isLoading}
          />
        )} */}
      </div>
    </Modal>
  );
};

interface ArchiveTabProps {
  files: BackupFile[];
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  restoringFiles: Set<string>;
  isLoading: boolean;
}

const ArchiveTab = memo<ArchiveTabProps>(({ files, onDelete, onRestore, restoringFiles, isLoading }) => (
  <div className="space-y-3">
    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="text-purple-500 animate-spin" />
      </div>
    ) : files.length === 0 ? (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3 max-w-xs">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl glass-subtle">
              <Archive size={32} className="text-text-secondary opacity-60" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-text-primary font-jakarta">No archived files</p>
            <p className="text-xs text-text-secondary font-jakarta">
              Files ending in .backup will appear here
            </p>
          </div>
        </div>
      </div>
    ) : (
      <>
        <p className="text-xs font-medium text-text-secondary font-jakarta px-1">
          Found {files.length} backup files
        </p>
        <div className="space-y-2">
          {files.map(file => {
            const fileCardFile: FileCardFile = {
              id: file.id,
              name: file.name,
              path: file.path,
              size: file.size,
              category: 'Archive',
              safeToRemove: true,
              lastUsed: file.archivedDate,
              archivedDate: file.archivedDate,
              originalPath: file.originalPath,
            };
            return (
              <FileCard
                key={file.id}
                file={fileCardFile}
                layout="list"
                variant="archive"
                showRelevanceScore={false}
                showSnippet={false}
                onRestore={() => onRestore(file.id)}
                isRestoring={restoringFiles.has(file.id)}
                onDelete={() => onDelete(file.id)}
              />
            );
          })}
        </div>
      </>
    )}
  </div>
));
ArchiveTab.displayName = 'ArchiveTab';

export default FilesPanel;
