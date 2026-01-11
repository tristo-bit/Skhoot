import { memo, useState } from 'react';
import { Folder, Trash2, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import { CleanupItem } from '../../types';
import { Button } from '../buttonFormat';
import { COLORS } from '../../src/constants';

export const CleanupItemCard = memo<{ item: CleanupItem }>(({ item }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [archived, setArchived] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      setIsRemoving(false);
      setRemoved(true);
    }, 1500);
  };

  const handleArchive = () => {
    setIsArchiving(true);
    setTimeout(() => {
      setIsArchiving(false);
      setArchived(true);
    }, 2000);
  };

  if (removed) {
    return (
      <div className="p-3 rounded-2xl border border-green-500/30 animate-in fade-in duration-300 bg-green-500/10">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle size={16} />
          <span className="text-[11px] font-bold font-jakarta">
            {item.name} removed — {item.size} freed
          </span>
        </div>
      </div>
    );
  }

  if (archived) {
    return (
      <div className="p-3 rounded-2xl border border-accent/30 animate-in fade-in duration-300 bg-accent/10">
        <div className="flex items-center gap-2 text-accent">
          <Archive size={16} />
          <span className="text-[11px] font-bold font-jakarta">
            {item.name} archived — searchable via Skhoot
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-subtle p-4 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <Folder size={18} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold truncate text-text-primary font-jakarta">{item.name}</p>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full glass-subtle text-text-secondary">
              {item.size}
            </span>
          </div>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta text-text-secondary">{item.path}</p>
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded-xl glass-subtle">
        <p className="text-[10px] font-medium text-text-secondary font-jakarta leading-relaxed">
          {item.description}
        </p>
      </div>

      <div className={`mt-2 p-2.5 rounded-xl flex items-start gap-2 ${
        item.canRemove ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        {item.canRemove ? (
          <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <p className={`text-[10px] font-semibold font-jakarta leading-relaxed ${
          item.canRemove ? 'text-green-700' : 'text-amber-700'
        }`}>
          {item.consequence}
        </p>
      </div>

      <p className="text-[9px] font-medium text-gray-400 mt-2 font-jakarta">
        Last accessed: {item.lastAccessed}
      </p>

      {item.canRemove && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
          <Button onClick={handleRemove} disabled={isRemoving || isArchiving} variant="danger" size="xs" icon={<Trash2 size={12} className={isRemoving ? 'animate-spin' : ''} />} iconPosition="left" className="flex-1" loading={isRemoving}>
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
          <Button onClick={handleArchive} disabled={isRemoving || isArchiving} variant={isArchiving ? 'primary' : 'glass'} size="xs" icon={<Archive size={12} className={isArchiving ? 'animate-pulse' : ''} />} iconPosition="left" className="flex-1" loading={isArchiving}>
            {isArchiving ? 'Archiving...' : 'Archive'}
          </Button>
        </div>
      )}
    </div>
  );
});
CleanupItemCard.displayName = 'CleanupItemCard';

export const CleanupList = memo<{ items: CleanupItem[] }>(({ items }) => {
  const removableSize = items
    .filter(i => i.canRemove)
    .reduce((acc, item) => {
      const num = parseFloat(item.size);
      const unit = item.size.includes('GB') ? 1000 : 1;
      return acc + (num * unit);
    }, 0);

  return (
    <div className="mt-4 space-y-3">
      <div className="p-4 rounded-2xl border border-white/40" style={{ backgroundColor: `${COLORS.lemonIcing}40` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-jakarta">
              Potential Space Savings
            </p>
            <p className="text-xl font-black font-jakarta text-gray-800 mt-1">
              {(removableSize / 1000).toFixed(1)} GB
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${COLORS.almostAqua}60` }}>
            <Trash2 size={24} className="text-gray-600" />
          </div>
        </div>
        <p className="text-[10px] font-medium text-gray-500 mt-2 font-jakarta">
          {items.filter(i => i.canRemove).length} of {items.length} items can be safely removed
        </p>
      </div>

      {items.map((item, index) => (
        <div key={item.id} style={{ animationDelay: `${index * 0.08}s` }}>
          <CleanupItemCard item={item} />
        </div>
      ))}
    </div>
  );
});
CleanupList.displayName = 'CleanupList';
