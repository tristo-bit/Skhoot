/**
 * Search Files UI Plugin
 * 
 * Displays file search results with relevance scores and snippets.
 * Supports grid and compact layouts.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Grid, List, Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';
import { FileCard, FileCardFile } from '../../ui/FileCard';
import { useSettings } from '../../../src/contexts/SettingsContext';

// ============================================================================
// Parsing Functions
// ============================================================================

function parseSearchResults(output: string): FileCardFile[] {
  const files: FileCardFile[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Try grep-style output (file:line:content)
    const grepMatch = trimmed.match(/^(.+?):(\d+):(.*)$/);
    if (grepMatch) {
      const [, filePath, lineNum, snippet] = grepMatch;
      const fileName = filePath.split('/').pop() || filePath;
      
      const existing = files.find(f => f.path === filePath);
      if (!existing) {
        const fileInfo: FileCardFile = {
          id: filePath,
          name: fileName,
          path: filePath,
          size: 'Unknown',
          category: detectCategory(fileName),
          safeToRemove: false,
          lastUsed: 'Unknown',
          snippet: `Line ${lineNum}: ${snippet.slice(0, 100)}`,
          relevanceScore: 85,
        };
        files.push(fileInfo);
      }
      continue;
    }
    
    // Try simple file path
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      const fileName = trimmed.split(/[/\\]/).pop() || trimmed;
      files.push({
        id: trimmed,
        name: fileName,
        path: trimmed,
        size: 'Unknown',
        category: detectCategory(fileName),
        safeToRemove: false,
        lastUsed: 'Unknown',
      });
    }
  }
  
  return files;
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

export const SearchFilesUI = memo<ToolCallUIProps>(({ 
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

  // Parse search results
  const parsedFiles = useMemo(() => {
    if (!result?.success || !result.output) return [];
    return parseSearchResults(result.output);
  }, [result]);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigate = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path);
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
            {parsedFiles.length} {parsedFiles.length === 1 ? 'file' : 'files'} found
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
                showRelevanceScore={true}
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
                showRelevanceScore={true}
                showSnippet={true}
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

SearchFilesUI.displayName = 'SearchFilesUI';
