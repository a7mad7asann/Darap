import * as React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Safe, lightweight Arabic-first Markdown renderer that maps markdown tokens
 * to typed React JSX elements without dangerouslySetInnerHTML.
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-slate-800">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="leading-relaxed">
                {it}
              </li>
            ))}
          </ul>,
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 text-slate-800">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="leading-relaxed">
                {it}
              </li>
            ))}
          </ol>,
        );
      }
      currentList = null;
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // 1. Process inline code `code`
    const codeParts = text.split(/(`[^`]+`)/g);
    return codeParts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={pIdx}
            className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
            dir="ltr"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 2. Process links [label](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const fragments: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          fragments.push(renderTextFormatting(part.substring(lastIndex, match.index), `${pIdx}-${lastIndex}`));
        }

        const label = match[1];
        const rawUrl = match[2].trim();
        // Disallow dangerous URI protocols
        const isSafe = /^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/') || rawUrl.startsWith('#');
        const safeUrl = isSafe ? rawUrl : '#';

        fragments.push(
          <a
            key={`${pIdx}-${match.index}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-semibold transition"
          >
            {label}
          </a>,
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < part.length) {
        fragments.push(renderTextFormatting(part.substring(lastIndex), `${pIdx}-tail`));
      }

      return <React.Fragment key={pIdx}>{fragments}</React.Fragment>;
    });
  };

  const renderTextFormatting = (text: string, keyPrefix: string): React.ReactNode => {
    // Process Bold **text**
    const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
        const inner = bPart.slice(2, -2);
        return <strong key={`${keyPrefix}-b-${bIdx}`} className="font-bold text-slate-900">{inner}</strong>;
      }
      // Process Italic *text*
      const italicParts = bPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
          return <em key={`${keyPrefix}-i-${bIdx}-${iIdx}`} className="italic">{iPart.slice(1, -1)}</em>;
        }
        return <React.Fragment key={`${keyPrefix}-t-${bIdx}-${iIdx}`}>{iPart}</React.Fragment>;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs font-mono my-3 shadow-inner"
            dir="ltr"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>,
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-slate-800 mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-100">
          {renderInline(line.slice(3))}
        </h2>,
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-black text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-200">
          {renderInline(line.slice(2))}
        </h1>,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-r-4 border-emerald-500 bg-emerald-50/50 pr-4 pl-3 py-2 text-slate-700 italic rounded-l my-3 text-sm leading-relaxed"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    // Unordered List
    if (/^[-*]\s+/.test(line)) {
      const itemText = line.replace(/^[-*]\s+/, '');
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInline(itemText));
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(line)) {
      const itemText = line.replace(/^\d+\.\s+/, '');
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInline(itemText));
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-sm text-slate-800 leading-relaxed my-2">
        {renderInline(line)}
      </p>,
    );
  }

  flushList();

  return (
    <div className={`prose-darb leading-relaxed text-right ${className}`} dir="rtl">
      {elements}
    </div>
  );
}
