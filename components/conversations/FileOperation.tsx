/**
 * File Operation Component
 * 
 * Displays file read/write operations with file preview,
 * diff view for writes, and operation status.
 */

import React, { memo, useState } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Eye,
  Edit3,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '../buttonFormat';

// ============================================================================
// Types
// ============================================================================

export type FileOperationType = 'read' | 'write' | 'create' | 'delete' | 'append';

export interface FileOperationProps {
  type: FileOperationType;
  path: string;
  content?: string;
  originalContent?: string; // For diff view on writes
  success?: boolean;
  error?: string;
  isExecuting?: boolean;
  lineRange?: { start: number; end: number };
  bytesWritten?: number;
}

// ============================================================================
// Operation Icon Component
// ============================================================================

const OperationIcon: React.FC<{ type: FileOperationType; size?: number }> = ({ type, size = 16 }) => {
  const icons: Record<FileOperationType, React.ReactNode> = {
    read: <Eye size={size} />,
    write: <Edit3 size={size} />,
    create: <Plus size={size} />,
    delete: <Trash2 size={size} />,
    append: <Edit3 size={size} />,
  };
  return <>{icons[type]}</>;
};

// ============================================================================
// Operation Label
// ============================================================================

const getOperationLabel = (type: FileOperationType): string => {
  const labels: Record<FileOperationType, string> = {
    read: 'Read File',
    write: 'Write File',
    create: 'Create File',
    delete: 'Delete File',
    append: 'Append to File',
  };
  return labels[type];
};

const getOperationColor = (type: FileOperationType): string => {
  const colors: Record<FileOperationType, string> = {
    read: 'text-blue-500',
    write: 'text-amber-500',
    create: 'text-emerald-500',
    delete: 'text-red-500',
    append: 'text-purple-500',
  };
  return colors[type];
};

// ============================================================================
// File Operation Component
// ============================================================================

export const FileOperation = memo<FileOperationProps>(({
  type,
  path,
  content,
  originalContent,
  success,
  error,
  isExecuting = false,
  lineRange,
  bytesWritten,
}) => {
  const [isExpanded, setIsExpanded] = useState(type === 'read');
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const fileName = path.split('/').pop() || path;
  const directory = path.substring(0, path.lastIndexOf('/')) || '.';
  
  // Truncate content for preview
  const MAX_PREVIEW_LINES = 20;
  const contentLines = content?.split('\n') || [];
  const isTruncated = contentLines.length > MAX_PREVIEW_LINES;
  const previewContent = isTruncated 
    ? contentLines.slice(0, MAX_PREVIEW_LINES).join('\n') + '\n...'
    : content;

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple diff view (line-by-line comparison)
  const renderDiff = () => {
    if (!originalContent || !content) return null;
    
    const oldLines = originalContent.split('\n');
    const newLines = content.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    return (
      <div className="font-mono text-[11px]">
        {Array.from({ length: Math.min(maxLines, MAX_PREVIEW_LINES) }).map((_, i) => {
          const oldLine = oldLines[i] || '';
          const newLine = newLines[i] || '';
          const isChanged = oldLine !== newLine;
          const isAdded = i >= oldLines.length;
          const isRemoved = i >= newLines.length;
          
          if (!isChanged && !isAdded && !isRemoved) {
            return (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 text-text-secondary select-none">{i + 1}</span>
                <span className="flex-1 whitespace-pre-wrap break-all">{newLine}</span>
              </div>
            );
          }
          
          return (
            <div key={i}>
              {!isAdded && oldLine !== newLine && (
                <div className="flex bg-red-500/10">
                  <span className="w-8 text-right pr-2 text-red-500 select-none">-</span>
                  <span className="flex-1 whitespace-pre-wrap break-all text-red-500">{oldLine}</span>
                </div>
              )}
              {!isRemoved && (
                <div className={`flex ${isChanged || isAdded ? 'bg-emerald-500/10' : ''}`}>
                  <span className={`w-8 text-right pr-2 select-none ${isChanged || isAdded ? 'text-emerald-500' : 'text-text-secondary'}`}>
                    {isChanged || isAdded ? '+' : i + 1}
                  </span>
                  <span className={`flex-1 whitespace-pre-wrap break-all ${isChanged || isAdded ? 'text-emerald-500' : ''}`}>
                    {newLine}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {maxLines > MAX_PREVIEW_LINES && (
          <div className="text-text-secondary mt-2">
            ... {maxLines - MAX_PREVIEW_LINES} more lines
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-glass-border glass-subtle animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0 ${getOperationColor(type)}`}>
          <OperationIcon type={type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-text-primary font-jakarta">
              {getOperationLabel(type)}
            </span>
            {isExecuting ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                <Clock size={12} className="animate-pulse" />
                Processing...
              </span>
            ) : success !== undefined ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                success 
                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-600 border-red-500/30'
              }`}>
                {success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {success ? 'Success' : 'Failed'}
              </span>
            ) : null}
            {bytesWritten !== undefined && (
              <span className="text-[10px] font-medium text-text-secondary">
                {bytesWritten} bytes
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <FileText size={10} className="text-text-secondary" />
            <span className="text-[11px] font-mono text-text-secondary truncate">
              {fileName}
            </span>
            {lineRange && (
              <span className="text-[10px] text-text-secondary">
                (lines {lineRange.start}-{lineRange.end})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-glass-border">
          {/* Path Info */}
          <div className="p-3 border-b border-glass-border flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen size={12} className="text-text-secondary flex-shrink-0" />
              <span className="text-[10px] font-mono text-text-secondary truncate">
                {directory}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPath}
                className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
              >
                <Copy size={10} />
                Copy path
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border-b border-red-500/20">
              <p className="text-[11px] font-medium text-red-600">{error}</p>
            </div>
          )}

          {/* Content Preview */}
          {content && type !== 'delete' && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {type === 'read' ? 'Content' : 'New Content'}
                </span>
                <div className="flex items-center gap-2">
                  {originalContent && (
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`text-[10px] font-bold transition-colors ${
                        showDiff ? 'text-accent' : 'text-text-secondary hover:text-accent'
                      }`}
                    >
                      {showDiff ? 'Hide diff' : 'Show diff'}
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <div className="bg-black/10 dark:bg-black/30 rounded-lg p-3 overflow-x-auto max-h-[300px] overflow-y-auto">
                {showDiff && originalContent ? (
                  renderDiff()
                ) : (
                  <pre className="text-[11px] font-mono text-text-primary whitespace-pre-wrap break-all">
                    {previewContent}
                  </pre>
                )}
                {isTruncated && !showDiff && (
                  <div className="mt-2 pt-2 border-t border-glass-border text-[10px] text-text-secondary">
                    Showing {MAX_PREVIEW_LINES} of {contentLines.length} lines
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isExecuting && !content && (
            <div className="p-3 flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-medium">Processing file...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FileOperation.displayName = 'FileOperation';
