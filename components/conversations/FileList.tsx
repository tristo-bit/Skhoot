import { memo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Grid, List } from 'lucide-react';
import { FileInfo } from '../../types';
import { useSettings } from '../../src/contexts/SettingsContext';
import { FileCard, type FileCardFile } from '../ui';

// Re-export helpers for backward compatibility
export { openFile, openFolder } from '../ui';

// Legacy exports - now use FileCard internally
export const FileItem = memo<{ file: FileInfo; searchInfo?: any }>(({ file }) => (
  <FileCard file={file as FileCardFile} layout="list" />
));
FileItem.displayName = 'FileItem';

export const FileItemGrid = memo<{ file: FileInfo }>(({ file }) => (
  <FileCard file={file as FileCardFile} layout="grid" />
));
FileItemGrid.displayName = 'FileItemGrid';

export const FileList = memo<{ files: FileInfo[]; searchInfo?: any }>(({ files, searchInfo }) => {
  const [showAll, setShowAll] = useState(false);
  const { searchDisplay } = useSettings();
  const INITIAL_DISPLAY_COUNT = 5;
  
  // Sort files by relevanceScore (highest first), then by name
  const sortedFiles = [...files].sort((a, b) => {
    const scoreA = (a as any).relevanceScore ?? (a as any).score ?? 0;
    const scoreB = (b as any).relevanceScore ?? (b as any).score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  });
  
  const hasMoreFiles = sortedFiles.length > INITIAL_DISPLAY_COUNT;
  const displayedFiles = showAll ? sortedFiles : sortedFiles.slice(0, INITIAL_DISPLAY_COUNT);
  
  // Always use compact grid layout when showing more results
  const useGridLayout = showAll || (searchDisplay.layout === 'grid' && !searchDisplay.gridOnlyForMore);

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
      
      {sortedFiles.length === 0 ? (
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
          {sortedFiles.length > 1 && (
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-bold text-text-secondary font-jakarta">
                Showing {displayedFiles.length} of {sortedFiles.length} results
              </span>
              <div className="flex items-center gap-2">
                {searchDisplay.layout === 'grid' && (
                  <span className="text-[9px] text-text-secondary flex items-center gap-1">
                    {useGridLayout ? <Grid size={10} /> : <List size={10} />}
                  </span>
                )}
                {hasMoreFiles && (
                  <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors">
                    {showAll ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show all {sortedFiles.length}</>}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {useGridLayout ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {displayedFiles.map((file, index) => (
                <div key={file.id} style={{ animationDelay: `${index * 0.03}s` }}>
                  <FileCard file={file as FileCardFile} layout="grid" />
                </div>
              ))}
            </div>
          ) : (
            displayedFiles.map((file, index) => (
              <div key={file.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <FileCard file={file as FileCardFile} layout="list" />
              </div>
            ))
          )}
          
          {hasMoreFiles && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full p-3 rounded-xl glass-subtle border-glass-border text-[11px] font-bold text-accent hover:glass-elevated transition-all flex items-center justify-center gap-2">
              <ChevronDown size={14} />
              Show {sortedFiles.length - INITIAL_DISPLAY_COUNT} more results
            </button>
          )}
        </>
      )}
    </div>
  );
});
FileList.displayName = 'FileList';
