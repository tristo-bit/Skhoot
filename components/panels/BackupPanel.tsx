import React, { memo, useState } from 'react';
import { Archive, Plus, Check, Brain, Bookmark } from 'lucide-react';
import { MOCK_CONNECTED_APPS, MOCK_ARCHIVED_FILES } from '../../browser-test/demo';
import { Modal, FileCard, type FileCardFile } from '../ui';
import { TabButton } from '../buttonFormat';
import { BookmarksTab } from './bookmarks/BookmarksTab';
import { MemoriesTab } from './memories/MemoriesTab';

interface FilesPanelProps {
  onClose: () => void;
}

type Tab = 'memories' | 'bookmarks' | 'apps' | 'archive';

const FilesPanel: React.FC<FilesPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('memories');
  const [connectedApps, setConnectedApps] = useState(MOCK_CONNECTED_APPS);
  const [archivedFiles, setArchivedFiles] = useState(MOCK_ARCHIVED_FILES);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'memories', label: 'Memories', icon: <Brain size={14} /> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={14} /> },
    // { id: 'apps', label: 'Apps', icon: <Bookmark size={14} /> },
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
      bodyClassName="files-panel-body-wrapper"
      closeAriaLabel="Close backup"
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
        {/* {activeTab === 'apps' && (
          <AppsTab apps={connectedApps} onToggle={toggleAppConnection} />
        )} */}
        {activeTab === 'archive' && (
          <ArchiveTab files={archivedFiles} onDelete={deleteArchive} />
        )}
      </div>
    </Modal>
  );
};

// interface AppsTabProps {
//   apps: typeof MOCK_CONNECTED_APPS;
//   onToggle: (id: string) => void;
// }

// const AppsTab = memo<AppsTabProps>(({ apps, onToggle }) => (
//   <div className="space-y-3">
//     <p className="text-xs font-medium text-text-secondary font-jakarta px-1">
//       Connect apps to search messages
//     </p>
//     <div className="space-y-2">
//       {apps.map(app => (
//         <div 
//           key={app.id}
//           className="p-4 rounded-xl glass-subtle border-glass-border flex items-center gap-3 hover:glass transition-all"
//         >
//           <span className="text-2xl">{app.icon}</span>
//           <div className="flex-1 min-w-0">
//             <p className="text-sm font-bold font-jakarta text-text-primary">{app.name}</p>
//             {app.connected && app.lastSync && (
//               <p className="text-xs font-medium text-text-secondary font-jakarta">
//                 Synced {app.lastSync}
//               </p>
//             )}
//           </div>
//           <button
//             onClick={() => onToggle(app.id)}
//             aria-label={app.connected ? `Disconnect ${app.name}` : `Connect ${app.name}`}
//             title={app.connected ? `Disconnect ${app.name}` : `Connect ${app.name}`}
//             className={`px-3 py-2 rounded-lg text-xs font-bold font-jakarta transition-all flex items-center gap-1.5 flex-shrink-0 ${
//               app.connected 
//                 ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
//                 : 'glass-subtle text-text-secondary hover:glass-elevated'
//             }`}
//           >
//             {app.connected ? (
//               <>
//                 <Check size={14} />
//                 Connected
//               </>
//             ) : (
//               <>
//                 <Plus size={14} />
//                 Connect
//               </>
//             )}
//           </button>
//         </div>
//       ))}
//     </div>
//   </div>
// ));
// AppsTab.displayName = 'AppsTab';

interface ArchiveTabProps {
  files: typeof MOCK_ARCHIVED_FILES;
  onDelete: (id: string) => void;
}

const ArchiveTab = memo<ArchiveTabProps>(({ files, onDelete }) => (
  <div className="space-y-3">
    {files.length === 0 ? (
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
              Archive files to save space while keeping them searchable
            </p>
          </div>
        </div>
      </div>
    ) : (
      <>
        <p className="text-xs font-medium text-text-secondary font-jakarta px-1">
          Archived files are indexed and searchable
        </p>
        <div className="space-y-2">
          {files.map(file => {
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
          })}
        </div>
      </>
    )}
  </div>
));
ArchiveTab.displayName = 'ArchiveTab';

export default FilesPanel;
