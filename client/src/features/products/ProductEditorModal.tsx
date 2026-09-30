/**
 * ProductEditorModal.tsx
 *
 * Two-section product editor:
 *  1. Product Info  — all fields that exist on the Product record
 *  2. Metal Finishes & Gallery — per-variant image management
 *
 * Create flow:
 *   Step 1 → POST /products  (creates product + bare variants)
 *   Step 2 → POST /products/variants/:variantId/images  (per image)
 *
 * Edit flow:
 *   Images are managed live (delete/upload/reorder) via API calls,
 *   no "pending" state — each action is committed immediately.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import {
  IMAGE_UPLOAD_CONFIGS,
  isRatioCorrect,
  meetsMinResolution,
} from '@/lib/imageUploadConfig';
import type { Product, ProductCategory, Subcategory, ProductVariant, VariantImage } from '@/types';
import {
  Gem, ImageIcon, Plus, Trash2, Star, GripVertical, AlertTriangle,
  ChevronUp, ChevronDown, Loader2, CheckCircle2,
} from 'lucide-react';

// ── Product image ratio config (3:2) ──────────────────────────────────────
const PRODUCT_IMG_CONFIG = IMAGE_UPLOAD_CONFIGS.PRODUCT_GALLERY;

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

// ── Types ──────────────────────────────────────────────────────────────────

interface PendingImage {
  id: string;           // temp client-side ID before upload
  file: File;
  previewUrl: string;
  uploading: boolean;
  error: string | null;
}

interface MetalSection {
  metalFinish: string;
  swatchColor: string;
  enabled: boolean;
  variantId: string | null;  // null until variant is created
  dbImages: VariantImage[];  // persisted images from DB
  pendingImages: PendingImage[];  // queued for upload (create mode)
}

const METAL_DEFS = [
  { metalFinish: 'Yellow Gold', swatchColor: '#E6C158' },
  { metalFinish: 'White Gold',  swatchColor: '#E4E1D8' },
  { metalFinish: 'Rose Gold',   swatchColor: '#E6B7A0' },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface ProductEditorModalProps {
  product: Product | null;
  categories: ProductCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMetalSections(product: Product | null): MetalSection[] {
  return METAL_DEFS.map(({ metalFinish, swatchColor }) => {
    const existingVariant = product?.variants?.find(v => v.metalFinish === metalFinish);
    return {
      metalFinish,
      swatchColor,
      enabled: !!existingVariant || !product,  // new product: all enabled by default
      variantId: existingVariant?.id || null,
      dbImages: (existingVariant?.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
      pendingImages: [],
    };
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Image upload helper ────────────────────────────────────────────────────

async function uploadFileToMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'products');
  const res = await apiClient.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url = res.data.data?.url || res.data?.url;
  if (!url) throw new Error('Upload returned no URL');
  return url;
}

// ── Variant Image Panel (edit mode — live) ─────────────────────────────────

interface VariantImagePanelProps {
  section: MetalSection;
  productId: string;
  totalProductImagesCount: number;
  onChange: (variantId: string, images: VariantImage[]) => void;
}

const VariantImagePanel: React.FC<VariantImagePanelProps> = ({ section, productId, totalProductImagesCount, onChange }) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  // Pending files to process after current crop (multi-file select)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingIsFirst, setPendingIsFirst] = useState(false);
  const [pendingBaseOrder, setPendingBaseOrder] = useState(0);
  const [pendingFileIndex, setPendingFileIndex] = useState(0);

  const refresh = useCallback(async () => {
    if (!section.variantId) return;
    const res = await apiClient.get(`/products/${productId}`);
    const updated: Product = res.data.data || res.data;
    const variant = updated.variants?.find(v => v.id === section.variantId);
    const sortedImages = (variant?.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    onChange(section.variantId!, sortedImages);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [section.variantId, productId, onChange, queryClient]);

  // Upload a single already-validated / cropped file to the server
  const doUploadSingleFile = async (file: File, order: number, isPrimary: boolean) => {
    const url = await uploadFileToMedia(file);
    await apiClient.post(`/products/variants/${section.variantId}/images`, {
      url,
      altText: `${section.metalFinish} view ${order + 1}`,
      sortOrder: order,
      isPrimary,
    });
  };

  // Process next file in the pending queue (called after each crop or direct upload)
  const processNextFile = useCallback(async (
    files: File[],
    idx: number,
    baseOrder: number,
    isFirst: boolean,
  ) => {
    if (idx >= files.length) {
      await refresh();
      setUploading(false);
      return;
    }
    const file = files[idx];
    const dataUrl = await readFileAsDataURL(file);
    const { width, height } = await getImageDimensions(dataUrl);

    // Minimum resolution
    if (!meetsMinResolution(width, height, PRODUCT_IMG_CONFIG)) {
      setUploadError(
        `Image resolution is too small. Please upload a higher-resolution image (minimum ${PRODUCT_IMG_CONFIG.minWidth}×${PRODUCT_IMG_CONFIG.minHeight} px).`,
      );
      setUploading(false);
      return;
    }

    if (isRatioCorrect(width, height, PRODUCT_IMG_CONFIG)) {
      // Correct ratio → upload directly
      await doUploadSingleFile(file, baseOrder + idx, isFirst && idx === 0);
      await processNextFile(files, idx + 1, baseOrder, isFirst);
    } else {
      // Wrong ratio → open crop modal
      setCropSrc(dataUrl);
      setCropFile(file);
      setPendingFiles(files);
      setPendingIsFirst(isFirst);
      setPendingBaseOrder(baseOrder);
      setPendingFileIndex(idx);
      setShowCropper(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.variantId, section.metalFinish, section.dbImages, refresh]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !section.variantId) return;
    e.target.value = '';
    setUploadError(null);
    setUploading(true);
    const isFirst = section.dbImages.length === 0;
    const baseOrder = section.dbImages.length;
    try {
      await processNextFile(files, 0, baseOrder, isFirst);
    } catch (err) {
      console.error('Upload failed', err);
      setUploading(false);
    }
  };

  // Called when the admin completes a crop
  const handleCropped = async (croppedFile: File) => {
    setShowCropper(false);
    setCropSrc(null);
    setCropFile(null);
    try {
      await doUploadSingleFile(
        croppedFile,
        pendingBaseOrder + pendingFileIndex,
        pendingIsFirst && pendingFileIndex === 0,
      );
      await processNextFile(pendingFiles, pendingFileIndex + 1, pendingBaseOrder, pendingIsFirst);
    } catch (err) {
      console.error('Upload after crop failed', err);
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
    setCropFile(null);
    setUploading(false);
  };

  const handleDelete = async (imageId: string) => {
    setDeletingId(imageId);
    try {
      await apiClient.delete(`/products/variant-images/${imageId}`);
      await refresh();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!section.variantId) return;
    setSettingPrimaryId(imageId);
    try {
      const updates = section.dbImages.map(img => ({
        id: img.id,
        sortOrder: img.sortOrder,
        isPrimary: img.id === imageId,
      }));
      await apiClient.patch(`/products/variants/${section.variantId}/images/reorder`, { images: updates });
      await refresh();
    } catch (err) {
      console.error('Set primary failed', err);
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0 || !section.variantId) return;
    const reordered = [...section.dbImages];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    const updates = reordered.map((img, i) => ({ id: img.id, sortOrder: i, isPrimary: img.isPrimary }));
    try {
      await apiClient.patch(`/products/variants/${section.variantId}/images/reorder`, { images: updates });
      await refresh();
    } catch (err) {
      console.error('Reorder failed', err);
    }
  };

  const handleMoveDown = async (idx: number) => {
    if (idx === section.dbImages.length - 1 || !section.variantId) return;
    const reordered = [...section.dbImages];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    const updates = reordered.map((img, i) => ({ id: img.id, sortOrder: i, isPrimary: img.isPrimary }));
    try {
      await apiClient.patch(`/products/variants/${section.variantId}/images/reorder`, { images: updates });
      await refresh();
    } catch (err) {
      console.error('Reorder failed', err);
    }
  };

  const images = section.dbImages;
  const missingWarning = images.length === 0;

  return (
    <>
      {/* Crop modal */}
      {showCropper && cropSrc && cropFile && (
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={cropSrc}
          originalFile={cropFile}
          config={PRODUCT_IMG_CONFIG}
          onCrop={handleCropped}
          onCancel={handleCropCancel}
        />
      )}

      <div className="space-y-3">
        {/* Image grid */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={img.id} className="relative group w-24 rounded-lg overflow-hidden border border-graphite-200 bg-graphite-50 flex-shrink-0">
                {/* Image */}
                <div className="aspect-square w-full overflow-hidden">
                  <img src={img.url} alt={img.altText || ''} className="w-full h-full object-cover" />
                </div>

                {/* Primary badge */}
                {img.isPrimary && (
                  <div className="absolute top-1 left-1 bg-brand-700 text-white rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" /> Primary
                  </div>
                )}

                {/* Controls overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-graphite-900/80 p-1 flex items-center justify-between gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-white/80 hover:text-white disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === images.length - 1}
                      className="p-0.5 rounded text-white/80 hover:text-white disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Set primary */}
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img.id)}
                      disabled={!!settingPrimaryId}
                      className="p-0.5 rounded text-yellow-400 hover:text-yellow-300"
                      title="Set as primary"
                    >
                      {settingPrimaryId === img.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Star className="h-3 w-3" />
                      }
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    disabled={!!deletingId}
                    className="p-0.5 rounded text-red-400 hover:text-red-300"
                    title="Delete image"
                  >
                    {deletingId === img.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Missing warning */}
        {missingWarning && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            No images uploaded for {section.metalFinish}
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {uploadError}
          </div>
        )}

        {/* Upload button or Maximum 5 limit message */}
        {totalProductImagesCount >= 5 ? (
          <div className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
            Maximum 5 images allowed per product.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-graphite-300 bg-graphite-50 px-3 py-2 text-xs font-semibold text-graphite-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition-colors">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {uploading ? 'Uploading...' : `Add ${section.metalFinish} Image`}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading || !section.variantId}
                onChange={handleUpload}
              />
            </label>
            <p className="text-[10px] text-brand-600 font-medium">
              Required ratio: 3:2 (e.g. 1500&times;1000 px) &middot; Wrong ratio opens crop editor
            </p>
          </div>
        )}
        {images.length > 0 && (
          <p className="text-[10px] text-graphite-400">{images.length} image{images.length !== 1 ? 's' : ''} · hover to edit · ★ = primary (shown on storefront)</p>
        )}
      </div>
    </>
  );
};


// ── Pending Image Panel (create mode — before product exists) ──────────────

interface PendingImagePanelProps {
  section: MetalSection;
  totalProductImagesCount: number;
  onChange: (metalFinish: string, pending: PendingImage[]) => void;
}

const PendingImagePanel: React.FC<PendingImagePanelProps> = ({ section, totalProductImagesCount, onChange }) => {
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const newPending: PendingImage[] = files.map(file => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
      error: null,
    }));
    onChange(section.metalFinish, [...section.pendingImages, ...newPending]);
  };

  const handleRemove = (id: string) => {
    const img = section.pendingImages.find(p => p.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onChange(section.metalFinish, section.pendingImages.filter(p => p.id !== id));
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...section.pendingImages];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(section.metalFinish, arr);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === section.pendingImages.length - 1) return;
    const arr = [...section.pendingImages];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(section.metalFinish, arr);
  };

  const images = section.pendingImages;

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group w-24 rounded-lg overflow-hidden border border-graphite-200 bg-graphite-50 flex-shrink-0">
              <div className="aspect-square w-full overflow-hidden">
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
              {idx === 0 && (
                <div className="absolute top-1 left-1 bg-brand-700 text-white rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" /> Primary
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-graphite-900/80 p-1 flex items-center justify-between gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="p-0.5 rounded text-white/80 hover:text-white disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => handleMoveDown(idx)} disabled={idx === images.length - 1} className="p-0.5 rounded text-white/80 hover:text-white disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                </div>
                <button type="button" onClick={() => handleRemove(img.id)} className="p-0.5 rounded text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          No images staged for {section.metalFinish}
        </div>
      )}

      {totalProductImagesCount >= 5 ? (
        <div className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
          Maximum 5 images allowed per product.
        </div>
      ) : (
        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-graphite-300 bg-graphite-50 px-3 py-2 text-xs font-semibold text-graphite-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Add {section.metalFinish} Image
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />
        </label>
      )}
      {images.length > 0 && (
        <p className="text-[10px] text-graphite-400">{images.length} image{images.length !== 1 ? 's' : ''} staged · first = primary</p>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSaved,
}) => {
  const isEditing = !!product;
  const queryClient = useQueryClient();

  // ── Product fields ─────────────────────────────────────────────────────
  const [name, setName]                       = useState('');
  const [sku, setSku]                         = useState('');
  const [categoryId, setCategoryId]           = useState('');
  const [subcategoryId, setSubcategoryId]     = useState('');
  const [price, setPrice]                     = useState('');
  const [originalPrice, setOriginalPrice]     = useState('');
  const [description, setDescription]         = useState('');
  const [netWeightGrams, setNetWeightGrams]   = useState('');
  const [totalDiamondCt, setTotalDiamondCt]   = useState('');
  const [totalDiamondPcs, setTotalDiamondPcs] = useState('');
  const [diamondGrade, setDiamondGrade]       = useState('EF VVS-VS');
  const [isPublished, setIsPublished]         = useState(false);
  const [inStock, setInStock]                 = useState(true);

  // ── Metal sections ─────────────────────────────────────────────────────
  const [metalSections, setMetalSections] = useState<MetalSection[]>(() => buildMetalSections(null));

  // ── UI state ───────────────────────────────────────────────────────────
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [saveStep, setSaveStep]       = useState<string | null>(null); // progress label

  // ── Populate form on open ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategoryId(product.categoryId || (categories[0]?.id ?? ''));
      setSubcategoryId(product.subcategoryId || '');
      setPrice(String(product.price || ''));
      setOriginalPrice(product.originalPrice ? String(product.originalPrice) : '');
      setDescription(product.description || '');
      setNetWeightGrams(product.netWeightGrams ? String(product.netWeightGrams) : '');
      setTotalDiamondCt(product.totalDiamondCt ? String(product.totalDiamondCt) : '');
      setTotalDiamondPcs(product.totalDiamondPcs ? String(product.totalDiamondPcs) : '');
      setDiamondGrade(product.diamondGrade || 'EF VVS-VS');
      setIsPublished(product.isPublished);
      setInStock(product.inStock);
      setMetalSections(buildMetalSections(product));
    } else {
      setName(''); setSku('');
      setCategoryId(categories[0]?.id || ''); setSubcategoryId('');
      setPrice(''); setOriginalPrice(''); setDescription('');
      setNetWeightGrams(''); setTotalDiamondCt(''); setTotalDiamondPcs('');
      setDiamondGrade('EF VVS-VS'); setIsPublished(false); setInStock(true);
      setMetalSections(buildMetalSections(null));
    }
    setError(null);
    setSaveStep(null);
  }, [product, categories, isOpen]);

  const activeCategory = categories.find(c => c.id === categoryId);
  const subcategories: Subcategory[] = activeCategory?.subcategories || [];

  const handleNameChange = (val: string) => {
    setName(val);
  };

  // ── Update metal section images (edit-mode callback) ───────────────────
  const handleVariantImagesUpdate = useCallback((variantId: string, images: VariantImage[]) => {
    setMetalSections(prev => prev.map(s =>
      s.variantId === variantId ? { ...s, dbImages: images } : s
    ));
  }, []);

  // ── Update pending images (create-mode callback) ───────────────────────
  const handlePendingImagesUpdate = useCallback((metalFinish: string, pending: PendingImage[]) => {
    setMetalSections(prev => prev.map(s =>
      s.metalFinish === metalFinish ? { ...s, pendingImages: pending } : s
    ));
  }, []);

  // ── Toggle metal section enabled ───────────────────────────────────────
  const toggleMetal = (metalFinish: string) => {
    setMetalSections(prev => prev.map(s =>
      s.metalFinish === metalFinish ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      setError('Product Name, Category, and Price are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const enabledMetals = metalSections.filter(s => s.enabled);

    try {
      if (isEditing) {
        // ── EDIT MODE ────────────────────────────────────────────────
        setSaveStep('Updating product info…');

        await apiClient.patch(`/products/${product!.id}`, {
          name,
          sku: sku.trim() ? sku.trim() : null,
          categoryId,
          subcategoryId: subcategoryId || null,
          price: Number(price),
          originalPrice: originalPrice.trim() ? Number(originalPrice) : null,
          description: description || null,
          netWeightGrams: netWeightGrams ? Number(netWeightGrams) : null,
          totalDiamondCt: totalDiamondCt ? Number(totalDiamondCt) : null,
          totalDiamondPcs: totalDiamondPcs ? Number(totalDiamondPcs) : null,
          diamondGrade: diamondGrade || null,
          isPublished,
          inStock,
        });

        // Create any metal variants that are newly enabled but don't exist yet
        for (const s of enabledMetals) {
          if (!s.variantId) {
            setSaveStep(`Creating ${s.metalFinish} variant…`);
            const vRes = await apiClient.post(`/products/${product!.id}/variants`, {
              metalFinish: s.metalFinish,
              swatchColor: s.swatchColor,
              isDefault: s.metalFinish === 'Yellow Gold',
              inStock: true,
            });
            const newVariantId = vRes.data.data?.id || vRes.data?.id;
            // Update local state so the panel can upload images
            setMetalSections(prev => prev.map(ms =>
              ms.metalFinish === s.metalFinish ? { ...ms, variantId: newVariantId } : ms
            ));
          }
        }

        setSaveStep(null);
        queryClient.invalidateQueries({ queryKey: ['products'] });
        onSaved();
        onClose();

      } else {
        // ── CREATE MODE ──────────────────────────────────────────────
        setSaveStep('Creating product…');

        // Step 1: Create product (no images)
        const prodRes = await apiClient.post('/products', {
          name,
          sku: sku.trim() ? sku.trim() : null,
          categoryId,
          subcategoryId: subcategoryId || null,
          price: Number(price),
          originalPrice: originalPrice.trim() ? Number(originalPrice) : null,
          description: description || null,
          netWeightGrams: netWeightGrams ? Number(netWeightGrams) : null,
          totalDiamondCt: totalDiamondCt ? Number(totalDiamondCt) : null,
          totalDiamondPcs: totalDiamondPcs ? Number(totalDiamondPcs) : null,
          diamondGrade: diamondGrade || null,
          isPublished,
          inStock,
        });

        const newProduct: Product = prodRes.data.data || prodRes.data;

        // Step 2: Create variants + upload images
        for (const s of enabledMetals) {
          setSaveStep(`Creating ${s.metalFinish} variant…`);

          const vRes = await apiClient.post(`/products/${newProduct.id}/variants`, {
            metalFinish: s.metalFinish,
            swatchColor: s.swatchColor,
            isDefault: s.metalFinish === 'Yellow Gold',
            inStock: true,
          });
          const variantId = vRes.data.data?.id || vRes.data?.id;

          if (s.pendingImages.length > 0) {
            setSaveStep(`Uploading ${s.metalFinish} images…`);
            for (let i = 0; i < s.pendingImages.length; i++) {
              const p = s.pendingImages[i];
              const url = await uploadFileToMedia(p.file);
              await apiClient.post(`/products/variants/${variantId}/images`, {
                url,
                altText: `${s.metalFinish} view ${i + 1}`,
                sortOrder: i,
                isPrimary: i === 0,
              });
              // cleanup object URL
              URL.revokeObjectURL(p.previewUrl);
            }
          }
        }

        setSaveStep('Done!');
        queryClient.invalidateQueries({ queryKey: ['products'] });
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
      setSaveStep(null);
    }
  };

  // ── Summary helpers ────────────────────────────────────────────────────
  const totalImages = metalSections.reduce((s, m) => {
    return s + (isEditing ? m.dbImages.length : m.pendingImages.length);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit — ${product?.name}` : 'Create New Jewelry Product'}
      description="Product info, diamond specs, metal finishes & image gallery."
      maxWidth="4xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Section 1: Product Info ──────────────────────────────── */}
        <div className="rounded-xl border border-graphite-200 bg-white p-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-graphite-500">Product Information</div>

          <div>
            <Input
              label="Product Title"
              placeholder="e.g. Solitaire Diamond Ring"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="SKU Code"
              placeholder="HOS-RNG-001"
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }}
              required
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Subcategory"
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...subcategories.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (₹ INR)"
              type="number"
              placeholder="45000"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
            />
            <Input
              label="Compare / Original Price (₹)"
              type="number"
              placeholder="55000"
              value={originalPrice}
              onChange={e => setOriginalPrice(e.target.value)}
            />
          </div>
        </div>

        {/* ── Section 2: Diamond Specs ─────────────────────────────── */}
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-graphite-700">
            <Gem className="h-4 w-4 text-brand-700" /> Diamond &amp; Crafting Specifications
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Input label="Net Weight (g)" type="number" step="0.01" placeholder="3.45" value={netWeightGrams} onChange={e => setNetWeightGrams(e.target.value)} />
            <Input label="Diamond Carat (ct)" type="number" step="0.001" placeholder="0.85" value={totalDiamondCt} onChange={e => setTotalDiamondCt(e.target.value)} />
            <Input label="Diamond Pieces" type="number" placeholder="1" value={totalDiamondPcs} onChange={e => setTotalDiamondPcs(e.target.value)} />
            <Input label="Diamond Grade" placeholder="EF VVS-VS" value={diamondGrade} onChange={e => setDiamondGrade(e.target.value)} />
          </div>
          <p className="text-[11px] text-graphite-500 italic">Standard: 24K Gold Vermeil over BIS hallmarked sterling silver. Grade: EF colour, VVS-VS clarity.</p>
        </div>

        {/* ── Section 3: Description ───────────────────────────────── */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-graphite-700">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detailed description of the jewelry piece..."
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs text-graphite-900 focus:border-brand-600 focus:outline-hidden"
          />
        </div>

        {/* ── Section 4: Metal Finishes & Gallery ─────────────────── */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-graphite-700">
                <ImageIcon className="h-4 w-4 text-brand-700" /> Metal Finishes &amp; Product Gallery
              </div>
              <p className="text-[11px] text-graphite-500 mt-0.5">
                Standard: Yellow Gold (3 images) + White Gold (1) + Rose Gold (1) = 5 total.
                {totalImages > 0 && <span className="ml-2 font-semibold text-brand-700">{totalImages} image{totalImages !== 1 ? 's' : ''} total.</span>}
              </p>
            </div>
          </div>

          {/* Metal toggle chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-graphite-500 uppercase tracking-wider">Active finishes:</span>
            {metalSections.map(s => (
              <button
                key={s.metalFinish}
                type="button"
                onClick={() => !isEditing && toggleMetal(s.metalFinish)}
                title={isEditing ? 'Toggle via variant section below' : undefined}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors',
                  s.enabled
                    ? 'bg-white border-graphite-300 text-graphite-800 shadow-sm'
                    : 'bg-graphite-100 border-graphite-200 text-graphite-400',
                  isEditing ? 'cursor-default' : 'cursor-pointer hover:border-brand-400',
                ].join(' ')}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: s.swatchColor }}
                />
                {s.metalFinish}
                {s.enabled && <CheckCircle2 className="h-3 w-3 text-brand-600" />}
              </button>
            ))}
            {!isEditing && (
              <span className="text-[10px] text-graphite-400 ml-1">Click to toggle</span>
            )}
          </div>

          {/* Per-metal image sections */}
          <div className="space-y-4">
            {metalSections.filter(s => s.enabled).map(s => (
              <div key={s.metalFinish} className="rounded-lg border border-graphite-200 bg-white p-3 space-y-3">
                {/* Metal header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: s.swatchColor }}
                    />
                    <span className="text-xs font-bold text-graphite-800">{s.metalFinish.toUpperCase()}</span>
                    <span className="text-[10px] text-graphite-400">
                      {isEditing
                        ? `${s.dbImages.length} image${s.dbImages.length !== 1 ? 's' : ''}`
                        : `${s.pendingImages.length} image${s.pendingImages.length !== 1 ? 's' : ''} staged`
                      }
                    </span>
                  </div>
                  {/* Recommended image count hint */}
                  <span className="text-[10px] text-graphite-400 italic">
                    {s.metalFinish === 'Yellow Gold' ? 'Recommended: 3' : 'Recommended: 1'}
                  </span>
                </div>

                {/* Image panel */}
                {isEditing && product ? (
                  <VariantImagePanel
                    section={s}
                    productId={product.id}
                    totalProductImagesCount={totalImages}
                    onChange={handleVariantImagesUpdate}
                  />
                ) : (
                  <PendingImagePanel
                    section={s}
                    totalProductImagesCount={totalImages}
                    onChange={handlePendingImagesUpdate}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5: Publish & Stock ───────────────────────────── */}
        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-graphite-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded-sm text-brand-700 focus:ring-brand-500"
            />
            <span>Publish on Website</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-graphite-700">
            <input
              type="checkbox"
              checked={inStock}
              onChange={e => setInStock(e.target.checked)}
              className="h-4 w-4 rounded-sm text-brand-700 focus:ring-brand-500"
            />
            <span>In Stock</span>
          </label>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-graphite-200">
          {/* Progress label */}
          <div className="text-xs text-graphite-500 italic">
            {saveStep && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {saveStep}
              </span>
            )}
          </div>
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
