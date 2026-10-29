import * as React from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Eye,
  Edit3,
} from 'lucide-react';
import { MarkdownContent } from './markdown-content';

interface RichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichEditor({
  value,
  onChange,
  placeholder = 'أدخل المحتوى التعليمي هنا...',
  minHeight = 'min-h-[220px]',
}: RichEditorProps) {
  const [tab, setTab] = React.useState<'edit' | 'preview'>('edit');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const applyFormat = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Find line start
    const before = value.substring(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = value.substring(lineStart, end);

    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
      {/* Editor Header / Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Formatting Actions (Visible only in edit tab) */}
        {tab === 'edit' ? (
          <div className="flex flex-wrap items-center gap-1 text-slate-600">
            <button
              type="button"
              onClick={() => applyFormat('**', '**', 'نص عريض')}
              title="عريض (Bold)"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('*', '*', 'نص مائل')}
              title="مائل (Italic)"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Italic className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => applyLinePrefix('# ')}
              title="عنوان رئيسي (H1)"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('## ')}
              title="عنوان فرعي (H2)"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('### ')}
              title="عنوان قسم (H3)"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => applyLinePrefix('- ')}
              title="قائمة نقطية"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('1. ')}
              title="قائمة رقمية"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('> ')}
              title="اقتباس أو ملاحظة"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Quote className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => applyFormat('`', '`', 'شفرة برمجية')}
              title="شفرة مضمنة"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('[نص الرابط](', ')', 'https://example.com')}
              title="إدراج رابط"
              className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500">معاينة تنسيق المحتوى باللغة العربية</span>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
              tab === 'edit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            محرر
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
              tab === 'preview'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            معاينة
          </button>
        </div>
      </div>

      {/* Main Area */}
      {tab === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full p-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none resize-y ${minHeight}`}
          dir="rtl"
        />
      ) : (
        <div className={`p-4 bg-slate-50/40 text-sm overflow-y-auto ${minHeight}`} dir="rtl">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-slate-400 italic text-xs">لا يوجد محتوى للمعاينة حتى الآن.</p>
          )}
        </div>
      )}
    </div>
  );
}
