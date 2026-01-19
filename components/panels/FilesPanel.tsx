import React, { memo, useState } from 'react';
import { Link2, Archive, Plus, Check, Brain, Bookmark } from 'lucide-react';
import { MOCK_CONNECTED_APPS, MOCK_ARCHIVED_FILES } from '../../browser-test/demo';
import { Modal, FileCard, type FileCardFile } from '../ui';
import { TabButton } from '../buttonFormat';

interface FilesPanelProps {
  onClose: () => void;
}

type Tab = 'links' | 'memories' | 'bookmarks' | 'apps' | 'archive';

const FilesPanel: React.FC<FilesPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('links');
  const [connectedApps, setConnectedApps] = useState(MOCK_CONNECTED_APPS);
  const [archivedFiles, setArchivedFiles] = useState(MOCK_ARCHIVED_FILES);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'links', label: 'Links', icon: <Link2 size={14} /> },
    { id: 'memories', label: 'Memories', icon: <Brain size={14} /> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={14} /> },
    { id: 'apps', label: 'Apps', icon: <Link2 size={14} /> },
    { id: 'archive', label: 'Archive', icon: <Archive size={14} /> },
  ];

  const toggleAppConnection = (appId: string) => {
    setConnectedApps(apps => 
      apps.map(app => 
        app.id === appId 
          ? { ...app, connected: !app.connected, lastSync: app.connected ? null : 'Just now' }
          : app
      )
    );
  };

  const deleteArchive = (archiveId: string) => {
    setArchivedFiles(files => files.filter(f => f.id !== archiveId));
  };

  return (
    <Modal
      title="Backup"
      onClose={onClose}
      panelClassName="files-panel"
      headerClassName="files-panel-header"
      bodyClassName="files-panel-body"
      closeAriaLabel="Close backup"
    >
      <div className="files-panel-tabs px-4 py-2 flex gap-1 flex-shrink-0">
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
      <div className="files-panel-content flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto no-scrollbar">
          {activeTab === 'links' && <LinksTab />}
          {activeTab === 'memories' && <MemoriesTab />}
          {activeTab === 'bookmarks' && <BookmarksTab />}
          {activeTab === 'apps' && (
            <AppsTab apps={connectedApps} onToggle={toggleAppConnection} />
          )}
          {activeTab === 'archive' && (
            <ArchiveTab files={archivedFiles} onDelete={deleteArchive} />
          )}
        </div>
      </div>
    </Modal>
  );
};

interface AppsTabProps {
  apps: typeof MOCK_CONNECTED_APPS;
  onToggle: (id: string) => void;
}

const AppsTab = memo<AppsTabProps>(({ apps, onToggle }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 font-jakarta">
      Connect apps to search messages
    </p>
    {apps.map(app => (
      <div 
        key={app.id}
        className="p-3 rounded-xl glass-subtle border-glass-border flex items-center gap-3"
      >
        <span className="text-2xl">{app.icon}</span>
        <div className="flex-1">
          <p className="text-[12px] font-bold font-jakarta text-text-primary">{app.name}</p>
          {app.connected && app.lastSync && (
            <p className="text-[9px] font-medium text-text-secondary font-jakarta">
              Synced {app.lastSync}
            </p>
          )}
        </div>
        <button
          onClick={() => onToggle(app.id)}
          aria-label={app.connected ? `Disconnect ${app.name}` : `Connect ${app.name}`}
          title={app.connected ? `Disconnect ${app.name}` : `Connect ${app.name}`}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-jakarta transition-all flex items-center gap-1.5 ${
            app.connected 
              ? 'bg-green-500/10 text-green-600' 
              : 'glass-subtle text-text-secondary hover:glass-elevated'
          }`}
        >
          {app.connected ? (
            <>
              <Check size={12} />
              Connected
            </>
          ) : (
            <>
              <Plus size={12} />
              Connect
            </>
          )}
        </button>
      </div>
    ))}
  </div>
));
AppsTab.displayName = 'AppsTab';

interface ArchiveTabProps {
  files: typeof MOCK_ARCHIVED_FILES;
  onDelete: (id: string) => void;
}

const ArchiveTab = memo<ArchiveTabProps>(({ files, onDelete }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3 font-jakarta">
      Archived files are indexed and searchable
    </p>
    {files.length === 0 ? (
      <div className="p-8 text-center">
        <Archive size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
        <p className="text-[12px] font-semibold text-text-secondary font-jakarta">No archived files</p>
        <p className="text-[10px] text-text-secondary font-jakarta mt-1">
          Archive files to save space while keeping them searchable
        </p>
      </div>
    ) : (
      files.map(file => {
        const fileCardFile: FileCardFile = {
          id: file.id,
          name: file.name,
          path: file.originalPath,
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
            onRestore={() => {/* TODO: implement restore */}}
            onDelete={() => onDelete(file.id)}
          />
        );
      })
    )}
  </div>
));
ArchiveTab.displayName = 'ArchiveTab';

const LinksTab = memo(() => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 font-jakarta">
      Save and organize important URLs
    </p>
    <div className="p-8 text-center">
      <Link2 size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
      <p className="text-[12px] font-semibold text-text-secondary font-jakarta">No links saved yet</p>
      <p className="text-[10px] text-text-secondary font-jakarta mt-1">
        Links will appear here when you save them
      </p>
    </div>
  </div>
));
LinksTab.displayName = 'LinksTab';

const MemoriesTab = memo(() => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 font-jakarta">
      Long-term memory storage for AI context
    </p>
    <div className="p-8 text-center">
      <Brain size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
      <p className="text-[12px] font-semibold text-text-secondary font-jakarta">No memories stored yet</p>
      <p className="text-[10px] text-text-secondary font-jakarta mt-1">
        Memories will help AI remember important context
      </p>
    </div>
  </div>
));
MemoriesTab.displayName = 'MemoriesTab';

const BookmarksTab = memo(() => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 font-jakarta">
      Bookmarked messages and conversations
    </p>
    <div className="p-8 text-center">
      <Bookmark size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
      <p className="text-[12px] font-semibold text-text-secondary font-jakarta">No bookmarks yet</p>
      <p className="text-[10px] text-text-secondary font-jakarta mt-1">
        Bookmark important messages to find them later
      </p>
    </div>
  </div>
));
BookmarksTab.displayName = 'BookmarksTab';

export default FilesPanel;
