import { memo } from 'react';
import { DiskInfo } from '../../types';

export const DiskUsage = memo<{ items: DiskInfo[] }>(({ items }) => (
  <div className="mt-4 p-4 glass-subtle rounded-2xl border-glass-border">
    <h4 className="text-[10px] font-bold mb-3 uppercase tracking-tighter opacity-40 font-jakarta text-text-secondary">
      Disk Analysis
    </h4>
    <div className="space-y-4">
      {items.map(disk => (
        <div key={disk.id} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-black text-text-primary font-jakarta">{disk.name}</span>
            <span className="text-[11px] font-bold text-text-secondary font-jakarta">
              {disk.usagePercentage}% used
            </span>
          </div>
          <div className="text-[11px] text-text-primary font-jakarta font-medium">
            {disk.availableSpace} GB available of {disk.totalSpace} GB
          </div>
          <div className="text-[11px] text-text-secondary font-jakarta font-medium mb-2">
            {disk.usedSpace} GB used ({disk.usagePercentage}%)
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--glass-border)' }}>
            <div 
              className="h-full transition-all duration-1000 rounded-full" 
              style={{ 
                width: `${disk.usagePercentage}%`,
                backgroundColor: 'var(--accent)'
              }} 
            />
          </div>
        </div>
      ))}
    </div>
  </div>
));
DiskUsage.displayName = 'DiskUsage';
