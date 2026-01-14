import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import { IconButton } from '../buttonFormat';

interface AddFileButtonProps {
  onClick: () => void;
  fileCount?: number;
}

export const AddFileButton = memo<AddFileButtonProps>(({ onClick, fileCount = 0 }) => {
  const hasFiles = fileCount > 0;

  return (
    <div className="relative">
      <IconButton
        icon={
          <Plus 
            size={22} 
            style={{ 
              width: 'calc(22px * var(--icon-scale) * var(--scale-text))', 
              height: 'calc(22px * var(--icon-scale) * var(--scale-text))' 
            }} 
          />
        }
        onClick={onClick}
        variant={hasFiles ? "glass" : "ghost"}
        size="lg"
        aria-label={hasFiles ? `${fileCount} files attached` : "Add files"}
        title={hasFiles ? `${fileCount} files attached - click to manage` : "Add files to message"}
        style={{
          backgroundColor: hasFiles ? '#10b98140' : '#10b98120',
          transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          padding: 'calc(12px * var(--component-scale) * var(--scale))',
          borderRadius: 'calc(16px * var(--component-scale) * var(--scale))',
        }}
      />
      {/* File count badge */}
      {hasFiles && (
        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center px-1">
          <span className="text-[10px] font-bold text-white">{fileCount}</span>
        </div>
      )}
    </div>
  );
});

AddFileButton.displayName = 'AddFileButton';
