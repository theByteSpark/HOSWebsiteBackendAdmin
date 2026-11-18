import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, X, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { RichTextEditor } from './RichTextEditor';
import type { Blog, BlogStatus } from '@/types';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://www.houseofseya.com').replace(/\/+$/, '');
const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

const slugify = (t: string) =>
  t.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

const Counter: React.FC<{ len: number; max: number }> = ({ len, max }) => (
  <span className={len > max ? 'text-red-600 font-semibold' : 'text-graphite-400'}>
    {len}/{max}
  </span>
);

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  coverImageAlt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  status: BlogStatus;
}

const EMPTY: FormState = {
  title: '', slug: '', excerpt: '', coverImage: '', coverImageAlt: '', content: '',
  metaTitle: '', metaDescription: '', metaKeywords: [], status: 'DRAFT',
};

export const BlogEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(isNew);

  const { data: blog, isLoading, isError } = useQuery<Blog>({
    queryKey: ['blog-admin', id],
    enabled: !isNew,
    queryFn: async () => {
      const res = await apiClient.get(`/blogs/admin/${id}`);
      return res.data.data || res.data;
    },
  });

  useEffect(() => {
    if (!blog) return;
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      coverImage: blog.coverImage || '',
      coverImageAlt: blog.coverImageAlt || '',
      content: blog.content,
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
      metaKeywords: blog.metaKeywords || [],
      status: blog.status,
    });
    setSlugTouched(true);
    setReady(true);
  }, [blog]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addKeywords = (raw: string) => {
    const parts = raw.split(',').map((k) => k.trim()).filter(Boolean);
    if (!parts.length) return;
    setForm((f) => ({
      ...f,
      metaKeywords: Array.from(new Set([...f.metaKeywords, ...parts])).slice(0, 30),
    }));
    setKeywordDraft('');
  };

  const save = async (target: BlogStatus) => {
    setError(null);
    setNotice(null);

    if (form.title.trim().length < 3) return setError('Please enter a title (at least 3 characters).');
    if (!form.content) return setError('Please write some content before saving.');
    if (target === 'PUBLISHED') {
      if (!form.metaTitle.trim()) return setError('Add a meta title before publishing — it is the headline Google shows.');
      if (!form.metaDescription.trim()) return setError('Add a meta description before publishing.');
      if (!form.coverImage) return setError('Add a main blog image before publishing.');
    }

    setSaving(target === 'PUBLISHED' ? 'publish' : 'draft');
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt,
      coverImage: form.coverImage,
      coverImageAlt: form.coverImageAlt,
      content: form.content,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      metaKeywords: form.metaKeywords,
      status: target,
    };

    try {
      if (isNew) {
        const res = await apiClient.post('/blogs', payload);
        const created: Blog = res.data.data || res.data;
        queryClient.invalidateQueries({ queryKey: ['blogs-admin'] });
        navigate(`/blogs/${created.id}`, { replace: true });
      } else {
        const res = await apiClient.put(`/blogs/${id}`, payload);
        const updated: Blog = res.data.data || res.data;
        setForm((f) => ({ ...f, slug: updated.slug, excerpt: updated.excerpt || '', status: updated.status }));
        queryClient.invalidateQueries({ queryKey: ['blogs-admin'] });
        queryClient.invalidateQueries({ queryKey: ['blog-admin', id] });
        setNotice(target === 'PUBLISHED' ? 'Saved and live on the website.' : 'Saved as draft.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save the blog. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  if (!isNew && isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">This blog could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/blogs')}>Back to blogs</Button>
      </div>
    );
  }
  if (!ready || (!isNew && isLoading)) {
    return <p className="py-12 text-center text-xs text-graphite-400">Loading blog…</p>;
  }

  const previewUrl = `${SITE_URL}/blogs/${form.slug || slugify(form.title) || 'your-blog-url'}`;
  const isPublished = form.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'New Blog' : 'Edit Blog'}
        badge={!isNew ? <StatusBadge status={form.status} /> : undefined}
        breadcrumbs={[{ label: 'Blogs', href: '/blogs' }, { label: isNew ? 'New' : 'Edit' }]}
        action={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/blogs')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {isPublished && !isNew && (
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" type="button">
                  <ExternalLink className="mr-1 h-4 w-4" /> View live
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" isLoading={saving === 'draft'} disabled={!!saving} onClick={() => save('DRAFT')}>
              {isPublished ? 'Unpublish (save as draft)' : 'Save draft'}
            </Button>
            <Button size="sm" isLoading={saving === 'publish'} disabled={!!saving} onClick={() => save('PUBLISHED')}>
              {isPublished ? 'Update' : 'Publish'}
            </Button>
          </>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ─────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border border-graphite-200 bg-white p-5">
            <Input
              label="Title"
              placeholder="e.g. Lab-Grown vs Natural Diamonds: What's the Difference?"
              value={form.title}
              onChange={(e) => {
                set('title', e.target.value);
                if (!slugTouched) set('slug', slugify(e.target.value));
              }}
            />
            <Input
              label="URL slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', slugify(e.target.value));
              }}
              helperText={
                isPublished
                  ? `${previewUrl} — changing the slug of a live blog breaks existing links.`
                  : previewUrl
              }
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-graphite-700">Short summary (shown on blog cards)</label>
              <textarea
                rows={2}
                maxLength={500}
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="Optional. If left empty, the first lines of the article are used."
                className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm text-graphite-900 placeholder:text-graphite-400 focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-graphite-700">Content</label>
            <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="space-y-5">
          <div className="space-y-3 rounded-xl border border-graphite-200 bg-white p-5">
            <ImageUploader
              label="Main blog image"
              value={form.coverImage}
              onChange={(url) => set('coverImage', url)}
              uploadContext="BLOG_COVER"
              folder="blogs"
              endpoint="/blogs/admin/upload-image"
            />
            <Input
              label="Image alt text"
              placeholder="Describe the image for search engines"
              value={form.coverImageAlt}
              onChange={(e) => set('coverImageAlt', e.target.value)}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-graphite-200 bg-white p-5">
            <div>
              <h3 className="text-sm font-bold text-graphite-900">SEO settings</h3>
              <p className="text-[11px] text-graphite-500">These go into the page&apos;s &lt;head&gt; tags.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-graphite-700">
                <label htmlFor="meta-title">Meta title</label>
                <Counter len={form.metaTitle.length} max={META_TITLE_MAX} />
              </div>
              <input
                id="meta-title"
                value={form.metaTitle}
                maxLength={70}
                onChange={(e) => set('metaTitle', e.target.value)}
                placeholder="Headline shown in Google results"
                className="h-9 w-full rounded-lg border border-graphite-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-graphite-700">
                <label htmlFor="meta-desc">Meta description</label>
                <Counter len={form.metaDescription.length} max={META_DESC_MAX} />
              </div>
              <textarea
                id="meta-desc"
                rows={3}
                maxLength={320}
                value={form.metaDescription}
                onChange={(e) => set('metaDescription', e.target.value)}
                placeholder="1–2 sentences summarising the article"
                className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-graphite-700">Meta tags (keywords)</label>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-graphite-300 bg-white p-2 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-500/10">
                {form.metaKeywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                    {k}
                    <button
                      type="button"
                      aria-label={`Remove ${k}`}
                      onClick={() => set('metaKeywords', form.metaKeywords.filter((x) => x !== k))}
                      className="text-brand-600 hover:text-red-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={keywordDraft}
                  onChange={(e) => {
                    if (e.target.value.includes(',')) addKeywords(e.target.value);
                    else setKeywordDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeywords(keywordDraft);
                    } else if (e.key === 'Backspace' && !keywordDraft && form.metaKeywords.length) {
                      set('metaKeywords', form.metaKeywords.slice(0, -1));
                    }
                  }}
                  onBlur={() => addKeywords(keywordDraft)}
                  placeholder={form.metaKeywords.length ? '' : 'Type a tag, press Enter'}
                  className="min-w-[120px] flex-1 border-0 bg-transparent px-1 text-sm focus:outline-hidden"
                />
              </div>
            </div>

            {/* Google-style preview */}
            <div className="rounded-lg border border-graphite-200 bg-graphite-50 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-graphite-400">Google preview</p>
              <p className="truncate text-[11px] text-graphite-500">{previewUrl}</p>
              <p className="truncate text-sm font-medium text-blue-700">{form.metaTitle || form.title || 'Your meta title'}</p>
              <p className="line-clamp-2 text-xs text-graphite-600">
                {form.metaDescription || 'Your meta description will appear here.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
