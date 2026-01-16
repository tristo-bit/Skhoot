import React, { memo } from 'react';
import { X, Files } from 'lucide-react';
import { getFileTypeInfo } from './FileAttachmentModal';

interface FileChipProps {
  fileName: string;
  filePath: string;
  onRemove: () => void;
}

export const FileChip = memo<FileChipProps>(({ fileName, filePath, onRemove }) => {
  const fileInfo = getFileTypeInfo(fileName);
  const FileIcon = fileInfo.icon;
  
  // Get file extension
  const extension = fileName.includes('.') 
    ? '.' + fileName.split('.').pop()?.toLowerCase() 
    : '';

  // Check if file is an image
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension.replace('.', ''));

  // Map color names to Tailwind classes - handle hex colors
  const getColorClasses = (color: string) => {
    if (color.startsWith('#')) {
      // For hex colors like #c0b7c9
      return `border-[${color}]/30 hover:bg-[${color}]/30`;
    }
    
    const colorClasses = {
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30',
      pink: 'bg-pink-500/20 border-pink-500/30 text-pink-400 hover:bg-pink-500/30',
      blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30',
      cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30',
      orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30',
      emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30',
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald;
  };

  const colorClass = getColorClasses(fileInfo.color);
  const bgStyle = fileInfo.color.startsWith('#') ? { backgroundColor: `${fileInfo.color}20` } : {};

  // Convert file path to proper URL for display
  const getImageUrl = (path: string) => {
    // Normalize path for Windows
    const normalizedPath = path.replace(/\\/g, '/');
    
    // Check if we're in Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Use Tauri's asset protocol
      return `asset://localhost/${normalizedPath}`;
    }
    
    // For web/development, use the backend API to serve the image
    return `http://localhost:3001/api/v1/files/image?path=${encodeURIComponent(path)}`;
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium animate-in fade-in zoom-in-95 duration-200 transition-colors group ${colorClass}`}
      style={bgStyle}
      title={filePath}
    >
      {isImage ? (
        <>
          <img 
            src={getImageUrl(filePath)} 
            alt={fileName}
            className="w-4 h-4 rounded object-cover flex-shrink-0"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
              const iconElement = e.currentTarget.nextElementSibling;
              if (iconElement) {
                iconElement.classList.remove('hidden');
              }
            }}
          />
          <FileIcon size={12} className="flex-shrink-0 hidden" style={fileInfo.color.startsWith('#') ? { color: fileInfo.color } : {}} />
        </>
      ) : (
        <FileIcon size={12} className="flex-shrink-0" style={fileInfo.color.startsWith('#') ? { color: fileInfo.color } : {}} />
      )}
      <span className="truncate max-w-[100px]" style={fileInfo.color.startsWith('#') ? { color: fileInfo.color } : {}}>{fileName}</span>
      {extension && (
        <span className="opacity-60 text-[10px]">{extension}</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex-shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors opacity-60 group-hover:opacity-100"
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
  attachedFiles?: { fileName: string; filePath: string }[];
}

export const MultiFileChip = memo<MultiFileChipProps>(({ fileCount, onClick, attachedFiles = [] }) => {
  // Get colors from attached files
  const fileColors = attachedFiles.map(file => {
    const fileInfo = getFileTypeInfo(file.fileName);
    return fileInfo.color;
  }).filter((color, index, self) => self.indexOf(color) === index); // Remove duplicates

  // Convert color names to hex values for consistent gradient
  const colorToHex = (color: string): string => {
    if (color.startsWith('#')) return color;
    
    const colorMap: Record<string, string> = {
      purple: '#a855f7',
      pink: '#ec4899',
      blue: '#3b82f6',
      cyan: '#06b6d4',
      orange: '#f97316',
      emerald: '#10b981',
    };
    
    return colorMap[color] || '#10b981';
  };

  // Create gradient background from file colors
  const getGradientStyle = () => {
    if (fileColors.length === 0) {
      return { 
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
      };
    }
    
    if (fileColors.length === 1) {
      const hexColor = colorToHex(fileColors[0]);
      return { 
        backgroundColor: `${hexColor}50`,
        borderColor: `${hexColor}80`,
      };
    }
    
    // Create gradient from multiple colors with more opacity for visibility
    const gradientStops = fileColors.map((color, index) => {
      const position = (index / (fileColors.length - 1)) * 100;
      const hexColor = colorToHex(color);
      return `${hexColor}80 ${position}%`;
    }).join(', ');
    
    return {
      background: `linear-gradient(135deg, ${gradientStops})`,
      borderColor: `${colorToHex(fileColors[0])}90`,
    };
  };

  const gradientStyle = getGradientStyle();
  
  // Use the first color for text, with better visibility
  const textColor = fileColors.length > 0 
    ? { color: colorToHex(fileColors[0]) } 
    : { color: '#10b981' };

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold animate-in fade-in zoom-in-95 duration-200 hover:opacity-90 transition-all shadow-sm"
      style={gradientStyle}
      title="Click to manage attached files"
    >
      <Files size={12} className="flex-shrink-0" style={textColor} />
      <span style={textColor}>{fileCount} files loaded</span>
    </button>
  );
});

MultiFileChip.displayName = 'MultiFileChip';
