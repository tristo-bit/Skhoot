import React, { memo, useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
}

// Base text style for AI messages
const baseTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
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
        <em key={key++} className="italic text-text-secondary">
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
      elements.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-70 transition-opacity text-accent"
        >
          {match[1]}
        </a>
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
          <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed glass-subtle text-text-secondary">
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
          className="my-2 pl-3 py-1 text-[12px] font-medium font-jakarta italic border-l-2 border-accent text-text-secondary"
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
