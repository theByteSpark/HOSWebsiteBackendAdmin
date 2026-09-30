/**
 * ImageUploader.tsx
 *
 * Drop-in image uploader with built-in aspect-ratio validation + crop modal.
 *
 * When an `uploadConfig` is provided:
 *  - If the uploaded image already matches the required ratio → upload directly.
 *  - If the ratio is wrong → open the ImageCropperModal so the admin can crop
 *    to the required ratio before uploading.
 *  - A backend-side validation guard also rejects mismatched uploads (defence-in-depth).
 *
 * If no `uploadConfig` is provided the component behaves exactly as before
 * (shows the optional `aspectRatioGuidance` text but does not enforce it).
 */

import React, { useState, useRef } from 'react';
import { Upload, X, RefreshCw, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import {
  IMAGE_UPLOAD_CONFIGS,
  ImageUploadContextKey,
  isRatioCorrect,
  meetsMinResolution,
} from '@/lib/imageUploadConfig';
import { thumbnailFor } from '@/lib/imageUrl';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Deprecated: use uploadContext instead. Kept for backward compat. */
  aspectRatioGuidance?: string;
  /** Which upload context drives ratio enforcement + crop. */
  uploadContext?: ImageUploadContextKey;
  folder?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  aspectRatioGuidance,
  uploadContext,
  folder = 'general',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = uploadContext ? IMAGE_UPLOAD_CONFIGS[uploadContext] : null;

  // The guidance string shown in the UI
  const guidance = config?.guidance ?? aspectRatioGuidance ?? null;

  // ── Core upload ──────────────────────────────────────────────────────────

  const doUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      // 'folder' must precede 'file' — multer's destination cb reads req.body.folder when the file part arrives
      formData.append('folder', folder);
      if (uploadContext) {
        formData.append('uploadContext', uploadContext);
      }
      formData.append('file', file);

      const res = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = res.data.data || res.data;
      const uploadedUrl = payload?.url;
      if (uploadedUrl) {
        setThumbUrl(payload.thumbnailUrl || thumbnailFor(uploadedUrl));
        onChange(uploadedUrl);
      } else {
        setError('Upload succeeded but no URL was returned. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload image. Please try again.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // ── File validation + ratio check ────────────────────────────────────────

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    // MIME type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // File size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size exceeds 10 MB. Please upload a smaller image.');
      return;
    }

    setError(null);

    // If no upload context configured, skip ratio checks
    if (!config) {
      await doUpload(file);
      return;
    }

    // Read data URL to check dimensions
    const dataUrl = await readFileAsDataURL(file);
    const { width, height } = await getImageDimensions(dataUrl);

    // Minimum resolution check
    if (!meetsMinResolution(width, height, config)) {
      setError(
        `Image resolution is too small. Please upload a higher-resolution image (minimum ${config.minWidth ?? 0}×${config.minHeight ?? 0} px).`,
      );
      return;
    }

    // Ratio check
    if (isRatioCorrect(width, height, config)) {
      // Already correct ratio → upload directly
      await doUpload(file);
    } else {
      // Wrong ratio → open crop modal
      setCropSrc(dataUrl);
      setCropFile(file);
      setShowCropper(true);
    }
  };

  // ── Crop modal callbacks ──────────────────────────────────────────────────

  const handleCropped = async (croppedFile: File) => {
    setShowCropper(false);
    setCropSrc(null);
    setCropFile(null);
    await doUpload(croppedFile);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
    setCropFile(null);
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Crop modal (portal-like fixed overlay) */}
      {showCropper && cropSrc && cropFile && config && (
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={cropSrc}
          originalFile={cropFile}
          config={config}
          onCrop={handleCropped}
          onCancel={handleCropCancel}
        />
      )}

      <div className="space-y-1.5">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-graphite-800">{label}</label>
          {guidance && (
            <span className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {guidance}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Existing image */}
        {value ? (
          <div className="relative rounded-xl border border-graphite-200 bg-graphite-50 p-3 flex items-center gap-4 group">
            <div className="h-20 w-28 rounded-lg bg-graphite-200 overflow-hidden border border-graphite-300 shrink-0 relative">
              <img
                src={thumbUrl || thumbnailFor(value) || value}
                alt={label}
                className="h-full w-full object-cover"
                onError={(e) => { if (e.currentTarget.src !== value) e.currentTarget.src = value; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-graphite-900 truncate">
                {value.split('/').pop()}
              </p>
              <p className="text-[11px] font-mono text-graphite-400 truncate mt-0.5">{value}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 bg-white px-2.5 py-1 rounded border border-graphite-200 shadow-2xs hover:bg-graphite-50 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isUploading ? 'animate-spin' : ''}`} />
                  {isUploading ? 'Uploading...' : 'Replace Image'}
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-white px-2.5 py-1 rounded border border-graphite-200 shadow-2xs hover:bg-red-50 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              dragActive
                ? 'border-brand-600 bg-brand-50'
                : 'border-graphite-300 hover:border-brand-500 bg-white hover:bg-graphite-50'
            }`}
          >
            {isUploading ? (
              <div className="py-2 flex flex-col items-center">
                <RefreshCw className="h-6 w-6 text-brand-700 animate-spin mb-2" />
                <p className="text-xs font-semibold text-graphite-700">Uploading image to server...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ImageIcon className="h-8 w-8 text-graphite-400 mb-2" />
                <p className="text-xs font-bold text-graphite-800">
                  Click to upload{' '}
                  <span className="font-normal text-graphite-500">or drag and drop</span>
                </p>
                <p className="text-[11px] text-graphite-400 mt-1">
                  Supports JPG, PNG, WEBP (Max 10 MB)
                </p>
                {config && (
                  <p className="text-[11px] text-brand-600 mt-1 font-medium">
                    Required ratio: {config.guidance}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              e.target.value = ''; // reset so same file can trigger crop again
              handleFileSelected(file);
            }
          }}
        />
      </div>
    </>
  );
};
