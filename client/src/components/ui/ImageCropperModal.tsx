/**
 * ImageCropperModal.tsx
 *
 * Reusable image crop dialog used across all Admin CMS upload contexts.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, ZoomIn, ZoomOut, RotateCcw, Crop as CropIcon, CheckCircle } from 'lucide-react';
import type { ImageUploadConfig } from '@/lib/imageUploadConfig';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  originalFile: File;
  config: ImageUploadConfig;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
  scale = 1,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image, 0, 0, image.naturalWidth, image.naturalHeight,
    0, 0, image.naturalWidth, image.naturalHeight,
  );
  ctx.restore();
}

function ratioLabel(ratio: number): string {
  const common: Record<string, string> = {
    '1.500': '3:2',
    '1.778': '16:9',
    '0.800': '4:5',
    '1.333': '4:3',
    '1.000': '1:1',
  };
  return common[ratio.toFixed(3)] ?? ratio.toFixed(2);
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  originalFile,
  config,
  onCrop,
  onCancel,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setPreviewUrl(null);
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
        await canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop, scale);
        setPreviewUrl(previewCanvasRef.current.toDataURL('image/jpeg', 0.92));
      }
    }, 150);
    return () => clearTimeout(t);
  }, [completedCrop, scale]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, config.ratio));
  }, [config.ratio]);

  const handleReset = () => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, config.ratio));
    }
  };

  const handleCropAndContinue = async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;
    setGenerating(true);
    try {
      await canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop, scale);
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvasRef.current!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas is empty'))),
          'image/jpeg',
          0.92,
        );
      });
      const baseName = originalFile.name.replace(/\.[^.]+$/, '');
      const croppedFile = new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
      onCrop(croppedFile);
    } catch (err) {
      console.error('Crop generation failed', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.72)' }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-graphite-200 bg-graphite-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <CropIcon className="h-4 w-4 text-brand-700" />
              <h2 className="text-sm font-bold text-graphite-900">Crop Image</h2>
            </div>
            <p className="text-xs text-graphite-500 mt-0.5">
              {config.label} &middot; Required ratio:{' '}
              <span className="font-semibold text-brand-700">{ratioLabel(config.ratio)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-graphite-200 transition-colors"
          >
            <X className="h-4 w-4 text-graphite-600" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex flex-col lg:flex-row gap-4">

            {/* Left: crop editor */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl overflow-hidden bg-graphite-900 flex items-center justify-center min-h-[300px]">
                <ReactCrop
                  crop={crop}
                  onChange={(_, pct) => setCrop(pct)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={config.ratio}
                  minWidth={50}
                  keepSelection
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop source"
                    onLoad={onImageLoad}
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'center',
                      display: 'block',
                      maxHeight: '55vh',
                      maxWidth: '100%',
                    }}
                  />
                </ReactCrop>
              </div>

              {/* Zoom controls */}
              <div className="mt-3 flex items-center gap-3 px-1">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))))}
                  className="p-1.5 rounded-lg border border-graphite-300 hover:bg-graphite-100 transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4 text-graphite-700" />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-brand-700"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(3, parseFloat((s + 0.1).toFixed(1))))}
                  className="p-1.5 rounded-lg border border-graphite-300 hover:bg-graphite-100 transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4 text-graphite-700" />
                </button>

                <span className="text-xs font-mono text-graphite-500 w-10 text-right">
                  {Math.round(scale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-1 flex items-center gap-1 text-xs font-semibold text-graphite-600 hover:text-brand-700 border border-graphite-300 rounded-lg px-2.5 py-1.5 hover:bg-graphite-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>

              <p className="mt-2 text-[11px] text-graphite-400 px-1">
                Drag the crop area to reposition &middot; Use the slider to zoom &middot; Ratio is locked to{' '}
                <strong>{ratioLabel(config.ratio)}</strong>
              </p>
            </div>

            {/* Right: preview panel */}
            <div className="w-full lg:w-52 flex-shrink-0">
              <p className="text-xs font-bold text-graphite-700 mb-2">Preview</p>
              <div
                className="rounded-xl overflow-hidden border border-graphite-200 bg-graphite-100 flex items-center justify-center"
                style={{ aspectRatio: String(config.ratio) }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Crop preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-graphite-400 text-center px-2">
                    Adjust crop to see preview
                  </span>
                )}
              </div>

              {previewUrl && (
                <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Preview ready
                </p>
              )}

              <div className="mt-3 p-3 bg-graphite-50 rounded-xl border border-graphite-200 text-[11px] text-graphite-600 space-y-1">
                <div className="font-bold text-graphite-700 mb-1">Requirements</div>
                <div>
                  Ratio:{' '}
                  <span className="font-semibold text-brand-700">{ratioLabel(config.ratio)}</span>
                </div>
                {config.minWidth && config.minHeight && (
                  <div>
                    Min size:{' '}
                    <span className="font-mono">
                      {config.minWidth}&times;{config.minHeight}px
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-graphite-400 mt-1">
                  Output saved as high-quality JPEG.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-graphite-200 bg-graphite-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-graphite-700 border border-graphite-300 rounded-xl hover:bg-graphite-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndContinue}
            disabled={!completedCrop?.width || generating}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-brand-700 rounded-xl hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                Processing...
              </>
            ) : (
              <>
                <CropIcon className="h-3.5 w-3.5" />
                Crop &amp; Continue
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden canvas for generating cropped output */}
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};
