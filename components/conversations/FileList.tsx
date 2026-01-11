import { memo, useState } from 'react';
import { FileText, Copy, Check, Folder, Search, ChevronDown, ChevronUp, Grid, List } from 'lucide-react';
import { FileInfo } from '../../types';
import { Button } from '../buttonFormat';
import { useSettings } from '../../src/contexts/SettingsContext';

export const FileItem = memo<{ file: FileInfo; searchInfo?: any }>(({ file }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = async () => {
    const fullPath = file.path;
    
    // Get the parent directory of the file
    const getParentDir = (path: string) => {
      const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      return lastSlash > 0 ? path.substring(0, lastSlash) : path;
    };
    
    const parentDir = getParentDir(fullPath);
    
    // Try backend API first (works in dev mode with backend running)
    try {
      const response = await fetch('http://localhost:3001/api/v1/files/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: parentDir }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Opened file location via backend:', parentDir);
          return;
        }
      }
    } catch (e) {
      // Backend not available - this is expected in browser-only mode
    }
    
    // Try Tauri shell plugin (works in Tauri app)
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(parentDir);
      console.log('✅ Opened file location via Tauri:', parentDir);
      return;
    } catch {
      // Tauri not available - this is expected in browser mode
    }
    
    // Fallback: copy path to clipboard with helpful message
    await navigator.clipboard.writeText(parentDir);
    alert(`📋 Path copied!\n\n${parentDir}\n\nTo open in file explorer:\n• Start the backend: cd backend && cargo run\n• Or paste this path in your file manager`);
  };

  return (
    <div className="glass-subtle p-3 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate text-text-primary font-jakarta">{file.name}</p>
          <p className="text-[10px] font-medium opacity-50 truncate font-jakarta text-text-secondary">{file.path}</p>
          
          {(file as any).relevanceScore !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                (file as any).relevanceScore >= 80 ? 'bg-green-500/20 text-green-600' :
                (file as any).relevanceScore >= 50 ? 'bg-yellow-500/20 text-yellow-600' :
                'bg-red-500/20 text-red-500'
              }`}>
                {(file as any).relevanceScore}% match
              </span>
              {(file as any).scoreReason && (
                <span className="text-[9px] font-medium text-text-secondary truncate max-w-[150px]" title={(file as any).scoreReason}>
                  {(file as any).scoreReason}
                </span>
              )}
            </div>
          )}
          
          {(file as any).score !== undefined && !(file as any).relevanceScore && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full glass-subtle text-accent">
                Score: {typeof (file as any).score === 'number' ? ((file as any).score * 100).toFixed(0) + '%' : (file as any).score}
              </span>
              {(file as any).source && (
                <span className="text-[9px] font-medium text-text-secondary">
                  via {(file as any).source}
                </span>
              )}
            </div>
          )}
          
          {(file as any).snippet && (
            <p className="text-[10px] font-medium text-text-secondary mt-1 italic">
              "{(file as any).snippet.substring(0, 60)}..."
            </p>
          )}
        </div>
        <span className="text-[10px] font-black whitespace-nowrap opacity-50 font-jakarta text-text-secondary">
          {file.size}
        </span>
      </div>
      
      <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
        <Button onClick={handleGo} variant="glass" size="xs" icon={<Folder size={12} />} iconPosition="left" className="flex-1 text-text-primary">
          Go
        </Button>
        <Button onClick={handleCopy} variant={copied ? 'primary' : 'glass'} size="xs" icon={copied ? <Check size={12} /> : <Copy size={12} />} iconPosition="left" className="flex-1">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
});
FileItem.displayName = 'FileItem';

// Compact grid item for grid layout
export const FileItemGrid = memo<{ file: FileInfo }>(({ file }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = async () => {
    const fullPath = file.path;
    const getParentDir = (path: string) => {
      const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      return lastSlash > 0 ? path.substring(0, lastSlash) : path;
    };
    const parentDir = getParentDir(fullPath);
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/files/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: parentDir }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) return;
      }
    } catch {}
    
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(parentDir);
      return;
    } catch {}
    
    await navigator.clipboard.writeText(parentDir);
    alert(`📋 Path copied!\n\n${parentDir}`);
  };

  return (
    <div className="glass-subtle p-2 rounded-xl border-glass-border animate-in fade-in duration-200 hover:glass-elevated transition-all group">
      <div className="flex flex-col items-center text-center gap-1">
        <div className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center">
          <FileText size={14} className="text-text-secondary" />
        </div>
        <p className="text-[10px] font-bold truncate w-full text-text-primary font-jakarta" title={file.name}>
          {file.name}
        </p>
        <p className="text-[8px] font-medium opacity-50 truncate w-full font-jakarta" title={file.path}>
          {file.path.split('/').slice(-2).join('/')}
        </p>
        
        {(file as any).relevanceScore !== undefined && (
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full ${
            (file as any).relevanceScore >= 80 ? 'bg-green-500/20 text-green-600' :
            (file as any).relevanceScore >= 50 ? 'bg-yellow-500/20 text-yellow-600' :
            'bg-red-500/20 text-red-500'
          }`}>
            {(file as any).relevanceScore}%
          </span>
        )}
        
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleGo} className="p-1 rounded glass-subtle hover:glass-elevated" title="Open folder">
            <Folder size={10} className="text-text-secondary" />
          </button>
          <button onClick={handleCopy} className={`p-1 rounded ${copied ? 'bg-accent/20' : 'glass-subtle hover:glass-elevated'}`} title="Copy path">
            {copied ? <Check size={10} className="text-accent" /> : <Copy size={10} className="text-text-secondary" />}
          </button>
        </div>
      </div>
    </div>
  );
});
FileItemGrid.displayName = 'FileItemGrid';

export const FileList = memo<{ files: FileInfo[]; searchInfo?: any }>(({ files, searchInfo }) => {
  const [showAll, setShowAll] = useState(false);
  const { searchDisplay } = useSettings();
  const INITIAL_DISPLAY_COUNT = 5;
  const hasMoreFiles = files.length > INITIAL_DISPLAY_COUNT;
  const displayedFiles = showAll ? files : files.slice(0, INITIAL_DISPLAY_COUNT);
  
  // Determine if we should use grid layout
  // If gridOnlyForMore is true, use list for initial results and grid for expanded
  const useGridLayout = searchDisplay.layout === 'grid' && 
    (!searchDisplay.gridOnlyForMore || showAll);

  return (
    <div className="mt-4 space-y-2">
      {searchInfo && (
        <div className="p-3 rounded-xl glass-subtle border-glass-border mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-accent" />
              <span className="text-[11px] font-bold text-text-primary font-jakarta">Search Results</span>
            </div>
            <span className="text-[10px] font-medium text-text-secondary">{searchInfo.executionTime}ms</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-text-secondary">
            <span>Query: "{searchInfo.query}"</span>
            <span>Mode: {searchInfo.searchMode || searchInfo.mode}</span>
            <span>Found: {searchInfo.totalResults}{searchInfo.originalResults && searchInfo.originalResults !== searchInfo.totalResults ? ` (filtered from ${searchInfo.originalResults})` : ''}</span>
          </div>
          
          {searchInfo.filterReason && (
            <p className="text-[9px] font-medium text-text-secondary mt-1 italic">
              {searchInfo.filterReason}
            </p>
          )}
          
          {searchInfo.suggestions?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-glass-border">
              <p className="text-[9px] font-bold text-text-secondary mb-1">💡 Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {searchInfo.suggestions.slice(0, 3).map((suggestion: any, i: number) => (
                  <span key={i} className="text-[9px] px-2 py-1 rounded-full glass-subtle text-accent cursor-pointer hover:glass-elevated transition-all" title={suggestion.reason}>
                    {suggestion.suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {searchInfo.error && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[9px] font-medium text-amber-700">⚠️ {searchInfo.error}</p>
            </div>
          )}
        </div>
      )}
      
      {files.length === 0 ? (
        <div className="p-4 text-center opacity-50">
          <p className="text-[11px] font-semibold font-jakarta">No files found</p>
          {searchInfo && (
            <p className="text-[10px] font-medium text-text-secondary mt-1">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <>
          {files.length > 1 && (
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-bold text-text-secondary font-jakarta">
                Showing {displayedFiles.length} of {files.length} results
              </span>
              <div className="flex items-center gap-2">
                {searchDisplay.layout === 'grid' && (
                  <span className="text-[9px] text-text-secondary flex items-center gap-1">
                    {useGridLayout ? <Grid size={10} /> : <List size={10} />}
                  </span>
                )}
                {hasMoreFiles && (
                  <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors">
                    {showAll ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show all {files.length}</>}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {useGridLayout ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {displayedFiles.map((file, index) => (
                <div key={file.id} style={{ animationDelay: `${index * 0.03}s` }}>
                  <FileItemGrid file={file} />
                </div>
              ))}
            </div>
          ) : (
            displayedFiles.map((file, index) => (
              <div key={file.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <FileItem file={file} />
              </div>
            ))
          )}
          
          {hasMoreFiles && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full p-3 rounded-xl glass-subtle border-glass-border text-[11px] font-bold text-accent hover:glass-elevated transition-all flex items-center justify-center gap-2">
              <ChevronDown size={14} />
              Show {files.length - INITIAL_DISPLAY_COUNT} more results
            </button>
          )}
        </>
      )}
    </div>
  );
});
FileList.displayName = 'FileList';
