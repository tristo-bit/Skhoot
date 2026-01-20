import React, { memo, useMemo, useState } from 'react';
import { linkPreviewService, PreviewData } from '../../services/linkPreviewService';
import { browserNavigationService } from '../../services/browserNavigationService';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Hyperlink Component
// ============================================================================

interface HyperlinkProps {
  href: string;
  children: React.ReactNode;
  linkType?: 'learning' | 'source';
}

const Hyperlink: React.FC<HyperlinkProps> = ({ href, children, linkType }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = async () => {
    // Clear any pending leave timeout
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }

    // Show preview after 200ms delay
    const timeout = setTimeout(async () => {
      setShowPreview(true);
      
      if (!previewData && !isLoading) {
        setIsLoading(true);
        try {
          const data = await linkPreviewService.fetchPreview(href);
          setPreviewData(data);
        } catch (error) {
          console.error('Failed to load preview:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }, 200);
    
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    // Clear hover timeout if still pending
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    // Dismiss preview after 300ms delay
    const timeout = setTimeout(() => {
      setShowPreview(false);
    }, 300);
    
    setLeaveTimeout(timeout);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await browserNavigationService.openUrl(href);
    } catch (error) {
      console.error('Failed to open URL:', error);
      
      // Show user-friendly error notification
      const errorMessage = error instanceof Error ? error.message : 'Failed to open link';
      
      // Try to copy URL to clipboard as fallback
      try {
        await navigator.clipboard.writeText(href);
        alert(`Could not open link in browser.\n\nURL copied to clipboard:\n${href}`);
      } catch (clipboardError) {
        alert(`Could not open link in browser.\n\nPlease copy this URL manually:\n${href}`);
      }
    }
  };

  // Determine link color based on type
  const linkColor = linkType === 'source' 
    ? 'text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300'
    : 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300';

  return (
    <span className="relative inline-block">
      <a
        href={href}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`underline underline-offset-2 cursor-pointer transition-all duration-200 ${linkColor}`}
        tabIndex={0}
        role="link"
        aria-label={`Link to ${href}`}
      >
        {children}
      </a>
      
      {showPreview && (
        <HyperlinkPreview
          data={previewData}
          isLoading={isLoading}
          linkType={linkType}
        />
      )}
    </span>
  );
};

// ============================================================================
// Hyperlink Preview Component
// ============================================================================

interface HyperlinkPreviewProps {
  data: PreviewData | null;
  isLoading: boolean;
  linkType?: 'learning' | 'source';
}

const HyperlinkPreview: React.FC<HyperlinkPreviewProps> = ({ 
  data, 
  isLoading, 
  linkType 
}) => {
  return (
    <div 
      className="absolute z-50 mt-2 w-80 rounded-lg glass-elevated p-3 shadow-lg"
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(12px) saturate(1.2)'
      }}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-text-secondary">
          <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
          <span className="text-xs">Loading preview...</span>
        </div>
      ) : data ? (
        <>
          <div className="flex items-start gap-2 mb-2">
            {data.favicon && (
              <img src={data.favicon} alt="" className="w-4 h-4 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">
                {data.title}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {data.domain}
              </p>
            </div>
            {linkType && (
              <span className={`
                px-2 py-0.5 text-[9px] rounded-full
                ${linkType === 'learning' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}
              `}>
                {linkType === 'learning' ? 'Learn' : 'Source'}
              </span>
            )}
          </div>
          
          {data.description && (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
              {data.description}
            </p>
          )}
          
          <div className="mt-2 pt-2 border-t border-dashed border-glass-border">
            <p className="text-[9px] text-text-secondary truncate">
              {data.url}
            </p>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-secondary">No preview available</p>
      )}
    </div>
  );
};

// Base text style for AI messages - using primary color for better readability
const baseTextStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
};

// Parse inline markdown (bold, italic, code, links)
const parseInline = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text** or __text__
    let match = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (match) {
      elements.push(
        <strong key={key++} className="font-black text-text-primary">
          {parseInline(match[2])}
        </strong>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic *text* or _text_
    match = remaining.match(/^(\*|_)(.+?)\1/);
    if (match) {
      elements.push(
        <em key={key++} className="italic text-text-primary">
          {parseInline(match[2])}
        </em>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code `code`
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      elements.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold glass-subtle text-accent"
        >
          {match[1]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Links [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const linkText = match[1];
      const url = match[2];
      
      // Detect link type from text or URL
      // Source links typically have "Source:" prefix or are numbered citations
      const isSourceLink = linkText.toLowerCase().startsWith('source:') || 
                          /^\[\d+\]$/.test(linkText);
      const linkType = isSourceLink ? 'source' : 'learning';
      
      elements.push(
        <Hyperlink
          key={key++}
          href={url}
          linkType={linkType}
        >
          {linkText}
        </Hyperlink>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Strikethrough ~~text~~
    match = remaining.match(/^~~(.+?)~~/);
    if (match) {
      elements.push(
        <del key={key++} className="line-through opacity-60">
          {parseInline(match[1])}
        </del>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text (up to next special character)
    match = remaining.match(/^[^*_`\[~]+/);
    if (match) {
      elements.push(<span key={key++}>{match[0]}</span>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Single special character (not part of markdown syntax)
    elements.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return elements;
};

// Parse block-level markdown
const parseMarkdown = (content: string): React.ReactNode[] => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={key++} className="my-3 rounded-xl overflow-hidden border border-black/5">
          {lang && (
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider font-jakarta glass-subtle text-text-secondary">
              {lang}
            </div>
          )}
          <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed glass-subtle text-text-primary">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const sizes = ['text-lg', 'text-base', 'text-[14px]', 'text-[13px]', 'text-[12px]', 'text-[11px]'];
      elements.push(
        <div
          key={key++}
          className={`${sizes[level - 1]} font-black font-jakarta mt-3 mb-1.5 text-text-primary`}
        >
          {parseInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(
        <hr
          key={key++}
          className="my-3 border-0 h-px bg-glass-border"
        />
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*[-*+]\s/, '');
        const indent = lines[i].match(/^(\s*)/)?.[1].length || 0;
        listItems.push(
          <li
            key={listItems.length}
            className="flex items-start gap-2"
            style={{ marginLeft: indent * 8 }}
          >
            <span 
              className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-accent"
            />
            <span>{parseInline(itemText)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1 text-[13px] font-semibold font-jakarta" style={baseTextStyle}>
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^[\s]*\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*\d+\.\s/, '');
        listItems.push(
          <li key={listItems.length} className="flex items-start gap-2">
            <span className="text-[11px] font-black flex-shrink-0 w-5 text-accent">
              {num}.
            </span>
            <span>{parseInline(itemText)}</span>
          </li>
        );
        num++;
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1 text-[13px] font-semibold font-jakarta" style={baseTextStyle}>
          {listItems}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-2 pl-3 py-1 text-[12px] font-medium font-jakarta italic border-l-2 border-accent text-text-primary"
        >
          {quoteLines.map((l, idx) => (
            <p key={idx}>{parseInline(l)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={key++}
        className="text-[13px] leading-relaxed font-semibold font-jakarta my-1"
        style={baseTextStyle}
      >
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return elements;
};

export const MarkdownRenderer = memo<MarkdownRendererProps>(({ content, style }) => {
  const rendered = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="markdown-content" style={style}>
      {rendered}
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
