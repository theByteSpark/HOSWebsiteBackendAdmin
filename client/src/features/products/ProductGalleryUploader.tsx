/**
 * ProductGalleryUploader.tsx
 *
 * One shared gallery per product (not per metal finish). Admins can pick up to
 * MAX_PRODUCT_IMAGES files at once; each is checked for type and size, uploaded
 * directly (no cropping), and kept in the parent's state until the product is
 * saved. The first image is the primary / card image.
 */

import React, { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Upload, Trash2, ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';

export const MAX_PRODUCT_IMAGES = 5;

const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface GalleryImage {
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
}

interface Props {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

async function uploadFile(file: File): Promise<GalleryImage> {
  const formData = new FormData();
  formData.append('folder', 'products'); // must precede 'file' for multer's destination callback
  formData.append('file', file);
  const res = await apiClient.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const payload = res.data.data || res.data;
  if (!payload?.url) throw new Error('Upload returned no URL');
  return { url: payload.url, thumbnailUrl: payload.thumbnailUrl || null };
}

export const ProductGalleryUploader: React.FC<Props> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setError(null);
    setUploading(true);

    let working = images;
    const problems: string[] = [];

    for (const file of files) {
      if (working.length >= MAX_PRODUCT_IMAGES) {
        problems.push(`Only ${MAX_PRODUCT_IMAGES} images are allowed per product; extra files were skipped.`);
        break;
      }
      if (!VALID_TYPES.includes(file.type)) {
        problems.push(`"${file.name}" is not a JPG, PNG or WEBP image.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        problems.push(`"${file.name}" is larger than 10 MB.`);
        continue;
      }
      try {
        working = [...working, await uploadFile(file)];
        onChange(working);
      } catch (err: any) {
        problems.push(`"${file.name}": ${err.response?.data?.message || err.message || 'upload failed'}`);
      }
    }

    if (problems.length > 0) setError(problems.join(' '));
    setUploading(false);
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const full = images.length >= MAX_PRODUCT_IMAGES;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((img, idx) => (
            <div key={img.url} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-graphite-200 bg-graphite-100">
              <img src={img.thumbnailUrl || img.url} alt={img.altText || `Image ${idx + 1}`} className="h-full w-full object-contain" />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  <Star className="h-2.5 w-2.5" /> Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded p-0.5 text-white/80 hover:text-white disabled:opacity-30">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === images.length - 1} className="rounded p-0.5 text-white/80 hover:text-white disabled:opacity-30">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button type="button" onClick={() => remove(idx)} title="Remove image" className="rounded p-0.5 text-red-300 hover:text-red-200">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {full ? (
        <p className="text-[11px] text-graphite-400">Maximum {MAX_PRODUCT_IMAGES} images reached.</p>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-graphite-300 bg-white px-3 py-2 text-xs font-semibold text-graphite-700 hover:border-brand-400">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : `Upload images (up to ${MAX_PRODUCT_IMAGES - images.length} more)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handlePick}
          />
        </label>
      )}

      <p className="text-[10px] text-graphite-400">
        {images.length} / {MAX_PRODUCT_IMAGES} · JPG, PNG or WEBP, up to 10 MB each · first image is shown on the storefront card. Images are shared by all metal finishes.
      </p>
    </div>
  );
};
