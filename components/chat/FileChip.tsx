import React, { memo } from 'react';
import { FileText, X, Files } from 'lucide-react';

interface FileChipProps {
  fileName: string;
  filePath: string;
  onRemove: () => void;
}

export const FileChip = memo<FileChipProps>(({ fileName, filePath, onRemove }) => {
  // Get file extension
  const extension = fileName.includes('.') 
    ? '.' + fileName.split('.').pop()?.toLowerCase() 
    : '';

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in zoom-in-95 duration-200 hover:bg-emerald-500/30 transition-colors group"
      title={filePath}
    >
      <FileText size={12} className="flex-shrink-0" />
      <span className="truncate max-w-[100px]">{fileName}</span>
      {extension && (
        <span className="text-emerald-500/60 text-[10px]">{extension}</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex-shrink-0 p-0.5 rounded-full hover:bg-emerald-500/40 transition-colors opacity-60 group-hover:opacity-100"
        title="Remove file"
      >
        <X size={10} />
      </button>
    </div>
  );
});

FileChip.displayName = 'FileChip';

interface MultiFileChipProps {
  fileCount: number;
  onClick: () => void;
}

export const MultiFileChip = memo<MultiFileChipProps>(({ fileCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in zoom-in-95 duration-200 hover:bg-emerald-500/30 transition-colors"
      title="Click to manage attached files"
    >
      <Files size={12} className="flex-shrink-0" />
      <span>{fileCount} files loaded</span>
    </button>
  );
});

MultiFileChip.displayName = 'MultiFileChip';
