import React, { useState, useRef } from 'react';
import { Upload, X, RefreshCw, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface ImageUploaderProps {
  label: string;
  value: string; // Image URL
  onChange: (url: string) => void;
  aspectRatioGuidance?: string; // e.g. "Recommended: 16:9 (Landscape)" or "Recommended: 4:5 (Portrait)"
  folder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  aspectRatioGuidance,
  folder = 'general',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data.data?.url || res.data?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      } else {
        setError('Failed to get uploaded image URL');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-graphite-800">{label}</label>
        {aspectRatioGuidance && (
          <span className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
            {aspectRatioGuidance}
          </span>
        )}
      </div>

      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {value ? (
        <div className="relative rounded-xl border border-graphite-200 bg-graphite-50 p-3 flex items-center gap-4 group">
          <div className="h-20 w-28 rounded-lg bg-graphite-200 overflow-hidden border border-graphite-300 shrink-0 relative">
            <img src={value} alt={label} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-graphite-900 truncate">{value.split('/').pop()}</p>
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
                Click to upload <span className="font-normal text-graphite-500">or drag and drop</span>
              </p>
              <p className="text-[11px] text-graphite-400 mt-1">Supports JPG, PNG, WEBP (Max 10MB)</p>
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
          if (file) handleFileUpload(file);
        }}
      />
    </div>
  );
};
