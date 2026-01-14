/**
 * Command Output Component
 * 
 * Displays stdout/stderr with ANSI color support,
 * truncation for long output, and copy functionality.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface CommandOutputProps {
  output: string;
  isError?: boolean;
  maxLines?: number;
  showLineNumbers?: boolean;
  title?: string;
}

// ============================================================================
// ANSI Color Parser (simplified)
// ============================================================================

const ANSI_COLORS: Record<string, string> = {
  '30': 'text-gray-900 dark:text-gray-100',
  '31': 'text-red-500',
  '32': 'text-emerald-500',
  '33': 'text-amber-500',
  '34': 'text-blue-500',
  '35': 'text-purple-500',
  '36': 'text-cyan-500',
  '37': 'text-gray-300',
  '90': 'text-gray-500',
  '91': 'text-red-400',
  '92': 'text-emerald-400',
  '93': 'text-amber-400',
  '94': 'text-blue-400',
  '95': 'text-purple-400',
  '96': 'text-cyan-400',
  '97': 'text-white',
};

const parseAnsiColors = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  // Match ANSI escape sequences
  const regex = /\x1b\[([0-9;]+)m/g;
  let lastIndex = 0;
  let currentClass = '';
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(
        <span key={key++} className={currentClass}>
          {segment}
        </span>
      );
    }

    // Parse the ANSI code
    const codes = match[1].split(';');
    for (const code of codes) {
      if (code === '0') {
        currentClass = '';
      } else if (ANSI_COLORS[code]) {
        currentClass = ANSI_COLORS[code];
      } else if (code === '1') {
        currentClass += ' font-bold';
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} className={currentClass}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [text];
};

// ============================================================================
// Command Output Component
// ============================================================================

export const CommandOutput = memo<CommandOutputProps>(({
  output,
  isError = false,
  maxLines = 20,
  showLineNumbers = false,
  title,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => output.split('\n'), [output]);
  const isTruncated = lines.length > maxLines && !isExpanded;
  const displayLines = isTruncated ? lines.slice(0, maxLines) : lines;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!output.trim()) {
    return (
      <div className="p-3 text-[11px] font-mono text-text-secondary italic">
        No output
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-glass-border glass-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-text-secondary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {title || (isError ? 'Error Output' : 'Output')}
          </span>
          <span className="text-[10px] font-medium text-text-secondary">
            ({lines.length} lines)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lines.length > maxLines && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={12} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Show all
                </>
              )}
            </button>
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

      {/* Output Content */}
      <div className={`p-3 overflow-x-auto max-h-[400px] overflow-y-auto ${
        isError ? 'bg-red-500/5' : 'bg-black/10 dark:bg-black/30'
      }`}>
        <pre className={`text-[11px] font-mono leading-relaxed ${
          isError ? 'text-red-500' : 'text-text-primary'
        }`}>
          {showLineNumbers ? (
            <table className="w-full">
              <tbody>
                {displayLines.map((line, index) => (
                  <tr key={index} className="hover:bg-white/5">
                    <td className="pr-3 text-right text-text-secondary select-none w-8 align-top">
                      {index + 1}
                    </td>
                    <td className="whitespace-pre-wrap break-all">
                      {parseAnsiColors(line)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            displayLines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {parseAnsiColors(line)}
              </div>
            ))
          )}
          {isTruncated && (
            <div className="mt-2 pt-2 border-t border-glass-border text-text-secondary">
              ... {lines.length - maxLines} more lines
            </div>
          )}
        </pre>
      </div>
    </div>
  );
});

CommandOutput.displayName = 'CommandOutput';
