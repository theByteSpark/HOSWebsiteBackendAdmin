import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Table';
import { thumbnailFor } from '@/lib/imageUrl';
import { Upload, Trash2, CheckCircle2, AlertTriangle, Loader2, Copy } from 'lucide-react';

interface MediaAsset {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string | null;
  sizeBytes: number;
  inUse: boolean;
}

interface UploadResult {
  name: string;
  status: 'ok' | 'failed';
  message?: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
const CONCURRENCY = 4;
const PAGE_SIZE = 48;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const ImagesPage: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Upload batch state
  const [isUploading, setIsUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);

  const { data, isLoading, refetch } = useQuery<{ assets: MediaAsset[]; total: number; totalPages: number }>({
    queryKey: ['media-assets', page, search, unusedOnly],
    queryFn: async () => {
      const res = await apiClient.get('/media', {
        params: {
          folder: 'products',
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          unused: unusedOnly ? 'true' : undefined,
        },
      });
      return res.data.data || res.data;
    },
  });

  const assets = data?.assets || [];

  const uploadOne = async (file: File): Promise<UploadResult> => {
    const name = file.name.trim();
    if (!IMAGE_TYPES.includes(file.type)) return { name, status: 'failed', message: 'Only JPG, PNG or WEBP images are allowed' };
    if (file.size > MAX_BYTES) return { name, status: 'failed', message: 'Larger than 10 MB' };
    try {
      const formData = new FormData();
      // 'folder' must precede 'file' — multer's destination callback reads it when the file part arrives
      formData.append('folder', 'products');
      formData.append('requireUniqueName', 'true');
      formData.append('file', file);
      await apiClient.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return { name, status: 'ok' };
    } catch (err: any) {
      return { name, status: 'failed', message: err.response?.data?.message || 'Upload failed' };
    }
  };

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;

    // Names must be unique inside the selection too (case-insensitive).
    const seen = new Set<string>();
    const queue: File[] = [];
    const initial: UploadResult[] = [];
    for (const f of picked) {
      const key = f.name.trim().toLowerCase();
      if (seen.has(key)) {
        initial.push({ name: f.name, status: 'failed', message: 'Duplicate file name in this selection' });
      } else {
        seen.add(key);
        queue.push(f);
      }
    }

    setIsUploading(true);
    setResults(initial);
    setTotal(picked.length);
    setDone(initial.length);

    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const file = queue[next++];
        const result = await uploadOne(file);
        setResults((prev) => [...prev, result]);
        setDone((d) => d + 1);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    setIsUploading(false);
    setPage(1);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/media/${deleting.id}`);
      setDeleting(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete image.');
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const okCount = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'failed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Images"
        description="Upload all product images here first, then reference their file names in the Excel sheet (Image 1 to Image 5)."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePick}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              <Upload className="mr-1 h-4 w-4" /> Upload Images
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-graphite-200 bg-graphite-50 p-3 text-xs text-graphite-600 space-y-1">
        <p>Select as many files as you like (JPG, PNG or WEBP, up to 10 MB each). <strong>File names must be unique</strong>; a file whose name already exists is rejected.</p>
        <p>In Excel, type the file name including the extension, for example <span className="font-mono">ring-front.png</span> (not case-sensitive).</p>
      </div>

      {(isUploading || results.length > 0) && (
        <div className="space-y-3 rounded-xl border border-graphite-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-graphite-700">
            <span className="flex items-center gap-2">
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading ? `Uploading ${done} of ${total}…` : `Finished: ${okCount} uploaded, ${failed.length} failed`}
            </span>
            {!isUploading && (
              <button type="button" onClick={() => setResults([])} className="text-graphite-400 hover:text-graphite-700">
                Dismiss
              </button>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-graphite-100">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          {failed.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50">
              {failed.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-start gap-2 border-b border-red-100 px-3 py-1.5 text-xs text-red-700 last:border-0">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-mono">{f.name}</span>
                  <span>— {f.message}</span>
                </div>
              ))}
            </div>
          )}
          {!isUploading && okCount > 0 && failed.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> All files uploaded.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-graphite-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by file name..."
          className="w-full sm:max-w-xs"
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-graphite-700">
          <input
            type="checkbox"
            checked={unusedOnly}
            onChange={(e) => {
              setUnusedOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4"
          />
          Unused only
        </label>
        <span className="text-xs text-graphite-400 sm:ml-auto">{data?.total ?? 0} image(s)</span>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{deleteError}</div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-xs text-graphite-400">Loading images…</p>
      ) : assets.length === 0 ? (
        <p className="rounded-xl border border-graphite-200 bg-white py-12 text-center text-xs text-graphite-400">No images found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((a) => (
            <div key={a.id} className="group overflow-hidden rounded-lg border border-graphite-200 bg-white">
              <div className="relative aspect-[3/4] bg-graphite-100">
                <img
                  src={a.thumbnailUrl || thumbnailFor(a.url) || a.url}
                  alt={a.originalName}
                  loading="lazy"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    if (e.currentTarget.src !== a.url) e.currentTarget.src = a.url;
                  }}
                />
                <span
                  className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    a.inUse ? 'bg-emerald-600 text-white' : 'bg-graphite-700/80 text-white'
                  }`}
                >
                  {a.inUse ? 'In use' : 'Unused'}
                </span>
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate font-mono text-[11px] text-graphite-800" title={a.originalName}>{a.originalName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-graphite-400">{formatSize(a.sizeBytes)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Copy file name"
                      onClick={() => navigator.clipboard?.writeText(a.originalName)}
                      className="rounded p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={a.inUse ? 'In use — cannot delete' : 'Delete image'}
                      disabled={a.inUse}
                      onClick={() => setDeleting(a)}
                      className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={data?.totalPages || 1}
        totalItems={data?.total || 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Image"
        message={`Delete "${deleting?.originalName}" permanently from the server?`}
        confirmText="Delete Image"
        isLoading={isDeleting}
      />
    </div>
  );
};
