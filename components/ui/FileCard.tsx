/**
 * FileCard - Unified file display component
 * 
 * Combines features from:
 * - FileItem/FileItemGrid in FileList.tsx (relevance scores, snippets, actions)
 * - DirectoryItem in AgentAction.tsx (compact hover actions)
 * - Archive files in FilesPanel.tsx (restore/delete actions)
 * 
 * Supports multiple layouts, action configurations, and folder navigation.
 */

import React, { memo, useState } from 'react';
import { 
  File, 
  Folder, 
  Copy, 
  Check, 
  ExternalLink, 
  FolderOpen,
  Archive,
  Trash2,
  RotateCcw,
  MessageSquarePlus,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { FileInfo } from '../../types';
import { Button } from '../buttonFormat';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Open a file directly using backend API or Tauri shell
 */
export const openFile = async (filePath: string): Promise<boolean> => {
  // Try backend API first
  try {
    const response = await fetch('http://localhost:3001/api/v1/files/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
  } catch {}
  
  // Try Tauri shell plugin
  try {
    const { open } = await import(/* @vite-ignore */ '@tauri-apps/plugin-shell');
    await open(filePath);
    return true;
  } catch {}
  
  return false;
};

/**
 * Open parent folder and select the file
 */
export const openFolder = async (filePath: string): Promise<boolean> => {
  const normalizedPath = filePath.replace(/\//g, '\\');
  
  // Try backend API first
  try {
    const response = await fetch('http://localhost:3001/api/v1/files/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normalizedPath }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
  } catch {}
  
  // Try Tauri shell plugin
  try {
    const { Command } = await import(/* @vite-ignore */ '@tauri-apps/plugin-shell');
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('win')) {
      await Command.create('explorer', [`/select,${normalizedPath}`]).execute();
      return true;
    } else if (userAgent.includes('mac')) {
      await Command.create('open', ['-R', filePath]).execute();
      return true;
    } else {
      const lastSlash = filePath.lastIndexOf('/');
      const parentDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
      await Command.create('xdg-open', [parentDir]).execute();
      return true;
    }
  } catch {}
  
  // Fallback: just open parent directory
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const parentDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
  return openFile(parentDir);
};

/**
 * Add a file or folder to chat context
 */
export const addToChat = (fileName: string, filePath: string): void => {
  const event = new CustomEvent('add-file-reference', {
    detail: { fileName, filePath }
  });
  window.dispatchEvent(event);
};

// ============================================================================
// Types
// ============================================================================

export interface FileCardFile extends FileInfo {
  relevanceScore?: number;
  scoreReason?: string;
  snippet?: string;
  score?: number | string;
  source?: string;
  archivedDate?: string;
  originalPath?: string;
}

export type FileCardLayout = 'list' | 'grid' | 'compact';
export type FileCardVariant = 'default' | 'archive';

export interface FileCardProps {
  file: FileCardFile;
  layout?: FileCardLayout;
  variant?: FileCardVariant;
  showRelevanceScore?: boolean;
  showSnippet?: boolean;
  showActions?: boolean;
  showAddToChat?: boolean;
  onRestore?: (file: FileCardFile) => void;
  isRestoring?: boolean;
  onDelete?: (file: FileCardFile) => void;
  onNavigate?: (path: string) => void; // For folder navigation
}

// ============================================================================
// Relevance Score Badge
// ============================================================================

const RelevanceScoreBadge: React.FC<{ score: number; compact?: boolean }> = ({ score, compact }) => {
  const colorClass = score >= 80 
    ? 'bg-green-500/20 text-green-600' 
    : score >= 50 
      ? 'bg-yellow-500/20 text-yellow-600' 
      : 'bg-red-500/20 text-red-500';
  
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}>
      {score}%{!compact && ' match'}
    </span>
  );
};

// ============================================================================
// File Icon Component
// ============================================================================

const FileIcon: React.FC<{ 
  isFolder: boolean; 
  isArchive?: boolean;
  size?: number;
  className?: string;
}> = ({ isFolder, isArchive, size = 14, className = '' }) => {
  if (isArchive) {
    return <Archive size={size} className={`text-accent ${className}`} />;
  }
  if (isFolder) {
    return <Folder size={size} className={`text-amber-500 ${className}`} />;
  }
  return <File size={size} className={`text-text-secondary ${className}`} />;
};


// ============================================================================
// FileCard Component
// ============================================================================

export const FileCard = memo<FileCardProps>(({ 
  file, 
  layout = 'list',
  variant = 'default',
  showRelevanceScore = true,
  showSnippet = true,
  showActions = true,
  showAddToChat = true,
  onRestore,
  isRestoring = false,
  onDelete,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);
  const [addedToChat, setAddedToChat] = useState(false);
  const isFolder = file.category === 'Folder' || file.size === '-';
  const isArchive = variant === 'archive';

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const success = await openFile(file.path);
    if (!success) {
      await navigator.clipboard.writeText(file.path);
      alert(`📋 Path copied!\n\n${file.path}\n\nTo open the file:\n• Start the backend: cd backend && cargo run\n• Or paste this path in your file manager`);
    }
  };

  const handleGo = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const success = await openFolder(file.path);
    if (!success) {
      const lastSlash = Math.max(file.path.lastIndexOf('/'), file.path.lastIndexOf('\\'));
      const parentDir = lastSlash > 0 ? file.path.substring(0, lastSlash) : file.path;
      await navigator.clipboard.writeText(parentDir);
      alert(`📋 Path copied!\n\n${parentDir}\n\nTo open in file explorer:\n• Start the backend: cd backend && cargo run\n• Or paste this path in your file manager`);
    }
  };

  const handleAddToChat = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    addToChat(file.name, file.path);
    setAddedToChat(true);
    setTimeout(() => setAddedToChat(false), 2000);
  };

  const handleRestore = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onRestore?.(file);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDelete?.(file);
  };

  const handleNavigate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isFolder && onNavigate) {
      onNavigate(file.path);
    }
  };

  // Compact layout (for agent results)
  if (layout === 'compact') {
    return (
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg glass-subtle hover:glass-elevated transition-all group ${isFolder && onNavigate ? 'cursor-pointer' : ''}`}
        onClick={isFolder && onNavigate ? handleNavigate : undefined}
      >
        <div className="w-7 h-7 rounded-md glass-subtle flex items-center justify-center flex-shrink-0">
          <FileIcon isFolder={isFolder} isArchive={isArchive} size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-bold truncate text-text-primary font-jakarta">{file.name}</p>
            {isFolder && onNavigate && (
              <ChevronRight size={12} className="text-text-secondary flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-medium opacity-50 truncate font-jakarta text-text-secondary">
              {file.path}
            </p>
            {showRelevanceScore && file.relevanceScore !== undefined && (
              <RelevanceScoreBadge score={file.relevanceScore} compact />
            )}
          </div>
        </div>
        <span className="text-[9px] font-bold whitespace-nowrap opacity-50 font-jakarta text-text-secondary">
          {file.size}
        </span>
        {showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showAddToChat && (
              <button
                onClick={handleAddToChat}
                className="p-1 rounded glass-subtle hover:bg-purple-500/20 transition-colors"
                title={isFolder ? "Add folder to chat" : "Add to chat"}
              >
                {addedToChat ? <Check size={10} className="text-purple-500" /> : <MessageSquarePlus size={10} className="text-purple-500" />}
              </button>
            )}
            <button
              onClick={handleOpen}
              className="p-1 rounded glass-subtle hover:glass-elevated transition-colors"
              title="Open"
            >
              <ExternalLink size={10} className="text-accent" />
            </button>
            <button
              onClick={handleGo}
              className="p-1 rounded glass-subtle hover:glass-elevated transition-colors"
              title="Show in folder"
            >
              <FolderOpen size={10} className="text-text-secondary" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1 rounded glass-subtle hover:glass-elevated transition-colors"
              title="Copy path"
            >
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-text-secondary" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  if (layout === 'grid') {
    return (
      <div 
        className={`glass-subtle p-3 rounded-xl border-glass-border animate-in fade-in duration-200 hover:glass-elevated transition-all group ${isFolder && onNavigate ? 'cursor-pointer' : ''}`}
        onClick={isFolder && onNavigate ? handleNavigate : undefined}
      >
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-10 h-10 rounded-lg glass-subtle flex items-center justify-center">
            <FileIcon isFolder={isFolder} isArchive={isArchive} size={18} />
          </div>
          <div className="flex items-center gap-1 w-full">
            <p className="text-[11px] font-bold truncate text-text-primary font-jakarta w-full" title={file.name}>
              {file.name}
            </p>
            {isFolder && onNavigate && (
              <ChevronRight size={10} className="text-text-secondary flex-shrink-0" />
            )}
          </div>
          <p 
            className="text-[9px] font-medium opacity-50 truncate w-full font-jakarta cursor-pointer hover:opacity-80 hover:underline transition-opacity" 
            title={`Click to open: ${file.path}`}
            onClick={(e) => { e.stopPropagation(); handleGo(e); }}
          >
            {file.path.split('/').slice(-2).join('/')}
          </p>
          
          {showRelevanceScore && file.relevanceScore !== undefined && (
            <RelevanceScoreBadge score={file.relevanceScore} compact />
          )}
          
          {showActions && (
            <div className="flex gap-1 mt-2 w-full">
              {showAddToChat && (
                <button 
                  onClick={handleAddToChat} 
                  className={`flex-1 p-1.5 rounded-lg transition-colors flex items-center justify-center ${addedToChat ? 'bg-purple-500/30' : 'bg-purple-500/20 hover:bg-purple-500/30'}`}
                  title={isFolder ? "Add folder to chat" : "Add to chat"}
                >
                  {addedToChat ? <Check size={12} className="text-purple-500" /> : <MessageSquarePlus size={12} className="text-purple-500" />}
                </button>
              )}
              <button 
                onClick={handleOpen} 
                className="flex-1 p-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors flex items-center justify-center" 
                title="Open file"
              >
                <ExternalLink size={12} className="text-accent" />
              </button>
              <button 
                onClick={handleGo} 
                className="flex-1 p-1.5 rounded-lg glass-subtle hover:glass-elevated transition-colors flex items-center justify-center" 
                title="Open folder & select file"
              >
                <Folder size={12} className="text-text-secondary" />
              </button>
              <button 
                onClick={handleCopy} 
                className={`flex-1 p-1.5 rounded-lg transition-colors flex items-center justify-center ${copied ? 'bg-accent/20' : 'glass-subtle hover:glass-elevated'}`} 
                title="Copy path"
              >
                {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} className="text-text-secondary" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Archive variant (list layout)
  if (isArchive) {
    return (
      <div className="p-3 rounded-xl glass-subtle border-glass-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 glass-subtle">
            <FileIcon isFolder={isFolder} isArchive={true} size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold font-jakarta text-text-primary truncate">{file.name}</p>
            <p className="text-[9px] font-medium text-text-secondary font-jakarta truncate">
              {file.originalPath || file.path}
            </p>
            <p className="text-[9px] font-medium text-text-secondary font-jakarta mt-1">
              {file.size} • Archived {file.archivedDate || 'Unknown'}
            </p>
          </div>
        </div>
        {showActions && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold font-jakarta glass-subtle text-text-primary transition-all flex items-center justify-center gap-1.5 ${
                isRestoring ? 'opacity-50 cursor-wait' : 'hover:glass-elevated'
              }`}
              title={isRestoring ? 'Restoring...' : `Restore ${file.name}`}
            >
              {isRestoring ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw size={12} />
                  Restore
                </>
              )}
            </button>
            <button 
              onClick={handleDelete}
              disabled={isRestoring}
              className={`py-2 px-3 rounded-lg text-[10px] font-bold font-jakarta text-red-500 transition-all ${
                isRestoring ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
              title={`Delete ${file.name}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default list layout
  return (
    <div 
      className={`glass-subtle p-3 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300 ${isFolder && onNavigate ? 'cursor-pointer hover:glass-elevated' : ''}`}
      onClick={isFolder && onNavigate ? handleNavigate : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <FileIcon isFolder={isFolder} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[12px] font-bold truncate text-text-primary font-jakarta">{file.name}</p>
            {isFolder && onNavigate && (
              <ChevronRight size={14} className="text-text-secondary flex-shrink-0" />
            )}
          </div>
          <p 
            className="text-[10px] font-medium opacity-50 truncate font-jakarta text-text-secondary cursor-pointer hover:opacity-80 hover:underline transition-opacity"
            onClick={(e) => { e.stopPropagation(); handleGo(e); }}
            title="Click to open folder"
          >
            {file.path}
          </p>
          
          {/* Relevance Score */}
          {showRelevanceScore && file.relevanceScore !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <RelevanceScoreBadge score={file.relevanceScore} />
              {file.scoreReason && (
                <span className="text-[9px] font-medium text-text-secondary truncate max-w-[150px]" title={file.scoreReason}>
                  {file.scoreReason}
                </span>
              )}
            </div>
          )}
          
          {/* Legacy score display */}
          {showRelevanceScore && file.score !== undefined && !file.relevanceScore && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full glass-subtle text-accent">
                Score: {typeof file.score === 'number' ? (file.score * 100).toFixed(0) + '%' : file.score}
              </span>
              {file.source && (
                <span className="text-[9px] font-medium text-text-secondary">
                  via {file.source}
                </span>
              )}
            </div>
          )}
          
          {/* Snippet */}
          {showSnippet && file.snippet && (
            <p className="text-[10px] font-medium text-text-secondary mt-1 italic">
              "{file.snippet.substring(0, 60)}..."
            </p>
          )}
        </div>
        <span className="text-[10px] font-black whitespace-nowrap opacity-50 font-jakarta text-text-secondary">
          {file.size}
        </span>
      </div>
      
      {showActions && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
          {showAddToChat && (
            <Button 
              onClick={handleAddToChat} 
              variant={addedToChat ? 'primary' : 'glass'} 
              size="xs" 
              icon={addedToChat ? <Check size={12} /> : <MessageSquarePlus size={12} />} 
              iconPosition="left" 
              className="flex-1 text-purple-600"
            >
              {addedToChat ? 'Added!' : 'Add to Chat'}
            </Button>
          )}
          <Button onClick={handleOpen} variant="glass" size="xs" icon={<ExternalLink size={12} />} iconPosition="left" className="flex-1 text-text-primary">
            Open
          </Button>
          <Button onClick={handleGo} variant="glass" size="xs" icon={<Folder size={12} />} iconPosition="left" className="flex-1 text-text-primary">
            Folder
          </Button>
          <Button onClick={handleCopy} variant={copied ? 'primary' : 'glass'} size="xs" icon={copied ? <Check size={12} /> : <Copy size={12} />} iconPosition="left" className="flex-1 text-text-primary">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  );
});

FileCard.displayName = 'FileCard';
