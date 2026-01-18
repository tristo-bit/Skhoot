/**
 * List Directory UI Plugin
 * 
 * Displays directory listing results with file cards.
 * Supports grid and compact layouts with folder navigation.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Grid, List, Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';
import { FileCard, FileCardFile } from '../../ui/FileCard';
import { useSettings } from '../../../src/contexts/SettingsContext';

// ============================================================================
// Parsing Functions
// ============================================================================

function parseDirectoryListing(output: string, basePath: string = ''): FileCardFile[] {
  const files: FileCardFile[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('total ') || line.startsWith('Directory:')) {
      continue;
    }
    
    let parsed = parseUnixLsLine(line, basePath) || 
                 parseSimpleLine(line, basePath) ||
                 parseJsonLine(line);
    
    if (parsed) {
      files.push(parsed);
    }
  }
  
  return files;
}

function parseUnixLsLine(line: string, basePath: string): FileCardFile | null {
  const lsRegex = /^([d\-rwxsStT@+.]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/;
  const match = line.match(lsRegex);
  
  if (match) {
    const [, permissions, size, date, name] = match;
    const isDirectory = permissions.startsWith('d');
    const fullPath = basePath ? `${basePath}/${name}` : name;
    
    return {
      id: fullPath,
      name: name,
      path: fullPath,
      size: formatFileSize(parseInt(size, 10)),
      category: isDirectory ? 'Folder' : detectCategory(name),
      safeToRemove: false,
      lastUsed: date,
    };
  }
  
  return null;
}

function parseSimpleLine(line: string, basePath: string): FileCardFile | null {
  const trimmed = line.trim();
  if (!trimmed || (trimmed.includes(':') && !trimmed.includes('/'))) {
    return null;
  }
  
  let name = trimmed;
  let fullPath = trimmed;
  
  if (name.startsWith('./')) {
    name = name.slice(2);
  }
  
  const lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  const fileName = lastSlash >= 0 ? name.slice(lastSlash + 1) : name;
  
  if (basePath && !fullPath.startsWith('/') && !fullPath.startsWith('~')) {
    fullPath = `${basePath}/${name}`;
  }
  
  const isDirectory = trimmed.endsWith('/') || (!fileName.includes('.') && !trimmed.includes('.'));
  
  return {
    id: fullPath,
    name: fileName || name,
    path: fullPath,
    size: isDirectory ? '-' : 'Unknown',
    category: isDirectory ? 'Folder' : detectCategory(fileName),
    safeToRemove: false,
    lastUsed: 'Unknown',
  };
}

function parseJsonLine(line: string): FileCardFile | null {
  try {
    const data = JSON.parse(line);
    if (data.path || data.name) {
      return {
        id: data.path || data.name,
        name: data.name || data.path.split('/').pop() || data.path,
        path: data.path || data.name,
        size: data.size ? formatFileSize(data.size) : 'Unknown',
        category: data.type === 'directory' ? 'Folder' : detectCategory(data.name || ''),
        safeToRemove: false,
        lastUsed: data.modified || 'Unknown',
      };
    }
  } catch {
    // Not JSON
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes)) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategory(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const categories: Record<string, string[]> = {
    'Code': ['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h'],
    'Document': ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
    'Image': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
    'Config': ['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env'],
    'Style': ['css', 'scss', 'sass', 'less'],
  };
  
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  
  return 'Other';
}

// ============================================================================
// Component
// ============================================================================

export const ListDirectoryUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
  onNavigate,
}) => {
  const [localLayout, setLocalLayout] = useState<'list' | 'grid' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Get layout preference from settings
  const { searchDisplay } = useSettings();
  
  // Use local override if set, otherwise use settings
  const effectiveLayout = localLayout || (searchDisplay.layout === 'grid' ? 'grid' : 'compact');

  // Parse directory listing
  const parsedFiles = useMemo(() => {
    if (!result?.success || !result.output) return [];
    const basePath = toolCall.arguments.path || toolCall.arguments.directory || '.';
    return parseDirectoryListing(result.output, basePath);
  }, [result, toolCall.arguments]);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigate = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      // Fallback: dispatch event for agent to handle
      const event = new CustomEvent('agent-navigate-directory', {
        detail: { path }
      });
      window.dispatchEvent(event);
    }
  }, [onNavigate]);

  const toggleLayout = useCallback(() => {
    setLocalLayout(prev => {
      if (prev === 'grid') return 'compact';
      if (prev === 'compact' || prev === null) return 'grid';
      return 'compact';
    });
  }, []);

  if (!result) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Output' : 'Error'}
        </span>
        <div className="flex items-center gap-3">
          {parsedFiles.length > 0 && (
            <>
              {/* Grid/List toggle */}
              <button
                onClick={toggleLayout}
                className="flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-accent transition-colors"
                title={effectiveLayout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {effectiveLayout === 'grid' ? <Grid size={12} /> : <List size={12} />}
                <span>{effectiveLayout === 'grid' ? 'Grid view' : 'List view'}</span>
              </button>
              
              {/* Collapse/Expand toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-accent transition-colors"
              >
                {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
              </button>
            </>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* File UI - collapsible */}
      {isCollapsed ? (
        <div className="p-2 rounded-xl border border-glass-border bg-black/5 dark:bg-white/5">
          <p className="text-[11px] text-text-secondary">
            {parsedFiles.length} {parsedFiles.length === 1 ? 'item' : 'items'} found
          </p>
        </div>
      ) : parsedFiles.length > 0 ? (
        effectiveLayout === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
            {parsedFiles.map((file, index) => (
              <FileCard 
                key={file.id || index} 
                file={file} 
                layout="grid"
                showRelevanceScore={false}
                showSnippet={false}
                showAddToChat={true}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
            {parsedFiles.map((file, index) => (
              <FileCard 
                key={file.id || index} 
                file={file} 
                layout="compact"
                showRelevanceScore={false}
                showSnippet={false}
                showAddToChat={true}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )
      ) : (
        <pre className={`text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] ${
          result.success 
            ? 'text-text-primary bg-black/10 dark:bg-white/5' 
            : 'text-red-600 bg-red-500/10 border-red-500/20'
        }`}>
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

ListDirectoryUI.displayName = 'ListDirectoryUI';
