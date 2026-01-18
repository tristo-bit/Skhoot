/**
 * Read File UI Plugin
 * 
 * Displays file contents with syntax highlighting for code files
 * and markdown rendering for .md files.
 */

import React, { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';
import { MarkdownRenderer } from '../../ui';

// ============================================================================
// Helper Functions
// ============================================================================

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || '';
}

function isCodeFile(path: string): boolean {
  const ext = getFileExtension(path);
  const codeExtensions = [
    'js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'hpp',
    'css', 'scss', 'sass', 'less', 'html', 'xml', 'json', 'yaml', 'yml', 'toml',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'sql', 'graphql', 'md',
    'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'vim', 'dockerfile'
  ];
  return codeExtensions.includes(ext);
}

// ============================================================================
// Component
// ============================================================================

export const ReadFileUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return null;
  }

  const filePath = toolCall.arguments.path || '';
  const isMarkdown = filePath.endsWith('.md');
  const isCode = isCodeFile(filePath);

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Output' : 'Error'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* File content */}
      {result.success ? (
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar rounded-xl border border-glass-border bg-black/10 dark:bg-white/5">
          {isCode ? (
            <pre className="text-[11px] font-mono text-text-primary p-3 overflow-x-auto">
              <code>{result.output}</code>
            </pre>
          ) : isMarkdown ? (
            <div className="p-3">
              <MarkdownRenderer content={result.output} />
            </div>
          ) : (
            <pre className="text-[11px] font-mono text-text-primary p-3 overflow-x-auto">
              {result.output}
            </pre>
          )}
        </div>
      ) : (
        <pre className="text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] text-red-600 bg-red-500/10 border-red-500/20">
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

ReadFileUI.displayName = 'ReadFileUI';
