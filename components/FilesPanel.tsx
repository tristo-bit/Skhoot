import React, { memo, useState } from 'react';
import { X, HardDrive, Link2, Archive, RefreshCw, Plus, Trash2, FolderOpen, Check } from 'lucide-react';
import { COLORS, GLASS_STYLES } from '../constants';
import { MOCK_CONNECTED_APPS, MOCK_ARCHIVED_FILES } from '../browser-test/demo';

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
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[400px] max-h-[80%] rounded-3xl overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="text-lg font-black font-jakarta" style={{ color: COLORS.textPrimary }}>
            Utility
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-xl transition-all active:scale-95"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 flex gap-1 border-b border-black/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold font-jakarta transition-all ${
                activeTab === tab.id 
                  ? 'bg-black/5' 
                  : 'hover:bg-black/[0.02]'
              }`}
              style={{ color: activeTab === tab.id ? COLORS.textPrimary : COLORS.textSecondary }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[400px] no-scrollbar">
          {activeTab === 'disks' && <DisksTab />}
          {activeTab === 'apps' && (
            <AppsTab apps={connectedApps} onToggle={toggleAppConnection} />
          )}
          {activeTab === 'archive' && (
            <ArchiveTab files={archivedFiles} onDelete={deleteArchive} />
          )}
        </div>
      </div>
    </div>
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
          className="p-4 rounded-2xl border border-black/5"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.iceMelt}80` }}
            >
              <HardDrive size={18} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold font-jakarta text-gray-800">{disk.name}</p>
              <p className="text-[10px] font-medium text-gray-500 font-jakarta">
                {disk.free} available of {disk.total}
              </p>
            </div>
          </div>
          
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${disk.percent}%`,
                backgroundColor: disk.percent > 80 ? '#ef4444' : disk.percent > 60 ? COLORS.lemonIcing : COLORS.almostAqua,
              }}
            />
          </div>
          <p className="text-[9px] font-bold text-gray-400 mt-1.5 font-jakarta">
            {disk.used} used ({disk.percent}%)
          </p>
        </div>
      ))}
      
      <button 
        className="w-full p-3 rounded-xl border border-dashed border-black/10 text-[11px] font-bold font-jakarta text-gray-400 hover:bg-black/[0.02] transition-all flex items-center justify-center gap-2"
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
        className="p-3 rounded-xl border border-black/5 flex items-center gap-3"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
      >
        <span className="text-2xl">{app.icon}</span>
        <div className="flex-1">
          <p className="text-[12px] font-bold font-jakarta text-gray-800">{app.name}</p>
          {app.connected && app.lastSync && (
            <p className="text-[9px] font-medium text-gray-400 font-jakarta">
              Synced {app.lastSync}
            </p>
          )}
        </div>
        <button
          onClick={() => onToggle(app.id)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-jakarta transition-all flex items-center gap-1.5 ${
            app.connected 
              ? 'bg-green-500/10 text-green-600' 
              : 'bg-black/5 text-gray-500 hover:bg-black/10'
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
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 font-jakarta">
      Archived files are indexed and searchable
    </p>
    {files.length === 0 ? (
      <div className="p-8 text-center">
        <Archive size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-[12px] font-semibold text-gray-400 font-jakarta">No archived files</p>
        <p className="text-[10px] text-gray-400 font-jakarta mt-1">
          Archive files to save space while keeping them searchable
        </p>
      </div>
    ) : (
      files.map(file => (
        <div 
          key={file.id}
          className="p-3 rounded-xl border border-black/5"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${COLORS.orchidTint}50` }}
            >
              <Archive size={16} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold font-jakarta text-gray-800 truncate">{file.name}</p>
              <p className="text-[9px] font-medium text-gray-400 font-jakarta truncate">
                {file.originalPath}
              </p>
              <p className="text-[9px] font-medium text-gray-400 font-jakarta mt-1">
                {file.size} • Archived {file.archivedDate}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              className="flex-1 py-2 rounded-lg text-[10px] font-bold font-jakarta bg-black/5 text-gray-600 hover:bg-black/10 transition-all flex items-center justify-center gap-1.5"
            >
              <FolderOpen size={12} />
              Restore
            </button>
            <button 
              onClick={() => onDelete(file.id)}
              className="py-2 px-3 rounded-lg text-[10px] font-bold font-jakarta text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))
    )}
  </div>
));
ArchiveTab.displayName = 'ArchiveTab';

export default FilesPanel;
