/**
 * List Directory Loading UI
 * 
 * Custom loading component for directory listing with animated file icons.
 */

import React, { memo } from 'react';
import { FolderOpen, File, Loader2 } from 'lucide-react';
import { ToolCallLoadingProps } from '../registry/types';

export const ListDirectoryLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  const path = toolCall.arguments.path || toolCall.arguments.directory || '.';
  
  return (
    <div className="mt-2 p-4 rounded-xl border border-glass-border glass-subtle">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <FolderOpen size={24} className="text-amber-500" />
          <Loader2 
            size={16} 
            className="absolute -top-1 -right-1 text-accent animate-spin" 
          />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-text-primary mb-1">
            Reading directory...
          </p>
          <p className="text-[10px] font-mono text-text-secondary">
            {path}
          </p>
        </div>
      </div>
      
      {/* Animated file placeholders */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i}
            className="flex flex-col items-center gap-1 p-2 rounded-lg glass-subtle animate-pulse"
            style={{ 
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1.5s'
            }}
          >
            <File size={20} className="text-text-secondary opacity-30" />
            <div className="h-2 w-12 bg-text-secondary/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
});

ListDirectoryLoadingUI.displayName = 'ListDirectoryLoadingUI';
