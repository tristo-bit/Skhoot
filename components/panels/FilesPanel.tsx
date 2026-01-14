import React, { memo, useState } from 'react';
import { HardDrive, Link2, Archive, Plus, Check } from 'lucide-react';
import { MOCK_CONNECTED_APPS, MOCK_ARCHIVED_FILES } from '../../browser-test/demo';
import { Modal, FileCard, type FileCardFile } from '../ui';
import { TabButton } from '../buttonFormat';

interface FilesPanelProps {
  onClose: () => void;
}

type Tab = 'disks' | 'apps' | 'archive';

const FilesPanel: React.FC<FilesPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('disks');
  const [connectedApps, setConnectedApps] = useState(MOCK_CONNECTED_APPS);
  const [archivedFiles, setArchivedFiles] = useState(MOCK_ARCHIVED_FILES);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'disks', label: 'Disks', icon: <HardDrive size={14} /> },
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
      title="Utility"
      onClose={onClose}
      panelClassName="files-panel"
      headerClassName="files-panel-header"
      bodyClassName="files-panel-body"
      closeAriaLabel="Close utility"
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
          {activeTab === 'disks' && <DisksTab />}
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

const DisksTab = memo(() => {
  const disks = [
    { name: 'Macintosh HD', total: '500 GB', used: '320 GB', free: '180 GB', percent: 64 },
    { name: 'External SSD', total: '1 TB', used: '450 GB', free: '550 GB', percent: 45 },
  ];

  return (
    <div className="space-y-3">
      {disks.map((disk, i) => (
        <div 
          key={i}
          className="p-4 rounded-2xl glass-subtle border-glass-border"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glass-subtle">
              <HardDrive size={18} className="text-text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold font-jakarta text-text-primary">{disk.name}</p>
              <p className="text-[10px] font-medium text-text-secondary font-jakarta">
                {disk.free} available of {disk.total}
              </p>
            </div>
          </div>
          
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--glass-border)' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${disk.percent}%`,
                backgroundColor: disk.percent > 85 ? '#ef4444' : disk.percent > 60 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <p className="text-[9px] font-bold text-text-secondary mt-1.5 font-jakarta">
            {disk.used} used ({disk.percent}%)
          </p>
        </div>
      ))}
      
      <button
        className="w-full p-3 rounded-xl border border-dashed border-glass-border text-[11px] font-bold font-jakarta text-text-secondary hover:glass-subtle transition-all flex items-center justify-center gap-2"
        aria-label="Add External Drive"
        title="Add External Drive"
      >
        <Plus size={14} />
        Add External Drive
      </button>
    </div>
  );
});
DisksTab.displayName = 'DisksTab';

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

export default FilesPanel;
