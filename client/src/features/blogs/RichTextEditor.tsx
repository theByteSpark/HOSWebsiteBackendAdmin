import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter,
  AlignRight, Minus, Undo2, Redo2, RemoveFormatting, Pilcrow, Loader2, Table as TableIcon, Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const ToolButton: React.FC<{
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, active, disabled, onClick, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    // keep editor selection when clicking toolbar buttons
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn(
      'flex h-8 w-8 items-center justify-center rounded-md text-graphite-600 transition-colors hover:bg-graphite-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
      active && 'bg-brand-100 text-brand-800'
    )}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-1 h-5 w-px bg-graphite-200" />;

const Toolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Re-render the toolbar when selection / marks change
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      p: e.isActive('paragraph'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      ul: e.isActive('bulletList'),
      ol: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      inTable: e.isActive('table'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (leave empty to remove the link)', prev || 'https://');
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const onPickImage = async (file: File) => {
    setUploadError(null);
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Please choose a JPG, PNG, WEBP or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image is larger than 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('folder', 'blogs');
      fd.append('file', file);
      const res = await apiClient.post('/blogs/admin/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = res.data.data || res.data;
      if (!payload?.url) throw new Error('No URL returned');
      const alt = window.prompt('Describe this image (alt text, helps SEO and accessibility)', '') || '';
      editor.chain().focus().setImage({ src: payload.url, alt }).run();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const c = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 rounded-t-lg border-b border-graphite-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolButton title="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Paragraph" active={s.p} onClick={() => c().setParagraph().run()}><Pilcrow className="h-4 w-4" /></ToolButton>
        <ToolButton title="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Heading 4" active={s.h4} onClick={() => c().toggleHeading({ level: 4 }).run()}><Heading4 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton title="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Bullet list" active={s.ul} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
        <ToolButton title="Numbered list" active={s.ol} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Align left" active={s.left} onClick={() => c().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton title="Align center" active={s.center} onClick={() => c().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolButton>
        <ToolButton title="Align right" active={s.right} onClick={() => c().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Link" active={s.link} onClick={setLink}><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Insert image" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolButton>
        <ToolButton title="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolButton>
        {s.inTable && (
          <ToolButton title="Delete table" onClick={() => c().deleteTable().run()}><Trash2 className="h-4 w-4" /></ToolButton>
        )}
        <ToolButton title="Horizontal line" onClick={() => c().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
        <ToolButton title="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></ToolButton>
      </div>
      {uploadError && <p className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">{uploadError}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPickImage(f);
        }}
      />
    </div>
  );
};

// Tidy HTML coming from Google Docs / Word / web pages before the editor reads it:
//  - the page title is the H1, so pasted H1 becomes H2 (and H5/H6 become H4)
//  - images that are not normal http(s) URLs (Word/Docs embed base64 or temporary
//    blob links) cannot be stored, so they are dropped; use the Insert image button
const cleanPastedHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('h1').forEach((h) => retag(doc, h, 'h2'));
  doc.querySelectorAll('h5, h6').forEach((h) => retag(doc, h, 'h4'));
  doc.querySelectorAll('img').forEach((img) => {
    if (!/^https?:\/\//i.test(img.getAttribute('src') || '')) img.remove();
  });
  return doc.body.innerHTML;
};

function retag(doc: Document, el: Element, tag: string) {
  const next = doc.createElement(tag);
  next.innerHTML = el.innerHTML;
  el.replaceWith(next);
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      // StarterKit (v3) already bundles Link and Underline
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
      }),
      Image,
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your article…' }),
    ],
    content: value,
    editorProps: {
      transformPastedHTML: cleanPastedHtml,
      attributes: { class: 'rte-content min-h-[420px] px-4 py-4 focus:outline-none' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-graphite-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-500/10">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
