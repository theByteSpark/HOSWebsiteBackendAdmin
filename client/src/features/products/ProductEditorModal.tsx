/**
 * ProductEditorModal.tsx
 *
 * Product editor:
 *  1. Product Info  — all fields that exist on the Product record
 *  2. Metal Finishes — which finishes exist (swatches only, no per-finish images)
 *  3. Gallery        — one shared set of up to 5 product images, saved with the product
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { ProductGalleryUploader, GalleryImage, MAX_PRODUCT_IMAGES } from './ProductGalleryUploader';
import type { Product, ProductCategory, Subcategory } from '@/types';
import {
  Gem, ImageIcon, Plus, Trash2, Star, GripVertical, AlertTriangle,
  ChevronUp, ChevronDown, Loader2, CheckCircle2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface MetalSection {
  metalFinish: string;
  swatchColor: string;
  enabled: boolean;
  variantId: string | null;  // null until variant is created
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
    };
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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
  const [subcategoryId, setSubcategoryId]     = useState('');
  const [price, setPrice]                     = useState('');
  const [description, setDescription]         = useState('');
  const [netWeightGrams, setNetWeightGrams]   = useState('');
  const [totalDiamondCt, setTotalDiamondCt]   = useState('');
  const [smallDiamondCt, setSmallDiamondCt]   = useState('');
  const [totalDiamondPcs, setTotalDiamondPcs] = useState('');
  const [diamondGrade, setDiamondGrade]       = useState('EF VVS-VS');
  const [isPublished, setIsPublished]         = useState(false);
  const [inStock, setInStock]                 = useState(true);

  // ── Metal sections ─────────────────────────────────────────────────────
  const [metalSections, setMetalSections] = useState<MetalSection[]>(() => buildMetalSections(null));

  // ── Shared gallery (all metal finishes) ────────────────────────────────
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

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
      setSubcategoryId(product.subcategoryId || '');
      setPrice(String(product.price || ''));
      setDescription(product.description || '');
      setNetWeightGrams(product.netWeightGrams ? String(product.netWeightGrams) : '');
      setTotalDiamondCt(product.totalDiamondCt ? String(product.totalDiamondCt) : '');
      setSmallDiamondCt(product.smallDiamondCt ? String(product.smallDiamondCt) : '');
      setTotalDiamondPcs(product.totalDiamondPcs ? String(product.totalDiamondPcs) : '');
      setDiamondGrade(product.diamondGrade || 'EF VVS-VS');
      setIsPublished(product.isPublished);
      setInStock(product.inStock);
      setMetalSections(buildMetalSections(product));
      // Product-level images; legacy products with only per-finish images are
      // flattened (default finish first) so nothing is lost on the next save.
      const own = (product.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
      const legacy = (product.variants || [])
        .slice()
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .flatMap(v => (v.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
      const source = own.length > 0 ? own : legacy;
      const seen = new Set<string>();
      setGalleryImages(
        source
          .filter(i => (seen.has(i.url) ? false : (seen.add(i.url), true)))
          .slice(0, MAX_PRODUCT_IMAGES)
          .map(i => ({ url: i.url, thumbnailUrl: i.thumbnailUrl, altText: i.altText })),
      );
    } else {
      setName(''); setSku('');
      setSubcategoryId('');
      setPrice(''); setDescription('');
      setNetWeightGrams(''); setTotalDiamondCt(''); setSmallDiamondCt(''); setTotalDiamondPcs('');
      setDiamondGrade('EF VVS-VS'); setIsPublished(true); setInStock(true);
      setMetalSections(buildMetalSections(null));
      setGalleryImages([]);
    }
    setError(null);
    setSaveStep(null);
  }, [product, categories, isOpen]);

  // Subcategory is the only classification asked for; the backend sets the category from it.
  const subcategoryOptions = categories.flatMap(c =>
    (c.subcategories || []).map((s: Subcategory) => ({ value: s.id, label: `${s.name} (${c.name})` })),
  );

  const handleNameChange = (val: string) => {
    setName(val);
  };

  // ── Toggle metal section enabled ───────────────────────────────────────
  const toggleMetal = (metalFinish: string) => {
    setMetalSections(prev => prev.map(s =>
      s.metalFinish === metalFinish ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!name.trim()) missing.push('Product Title');
    if (!sku.trim()) missing.push('SKU Code');
    if (!subcategoryId) missing.push('Subcategory');
    if (!price || Number(price) <= 0) missing.push('Price');
    if (netWeightGrams === '') missing.push('Net Weight');
    if (totalDiamondCt === '') missing.push('Total Diamond Weight');
    if (smallDiamondCt === '') missing.push('Small Diamond Weight');
    if (!totalDiamondPcs || Number(totalDiamondPcs) < 1) missing.push('Total Diamond Pieces');
    if (!description.trim()) missing.push('Description');
    if (!metalSections.some(s => s.enabled)) missing.push('at least one Metal Finish');
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    const enabledMetals = metalSections.filter(s => s.enabled);
    const imagesPayload = galleryImages.map((img, i) => ({
      url: img.url,
      thumbnailUrl: img.thumbnailUrl || null,
      altText: img.altText || `${name} view ${i + 1}`,
      sortOrder: i,
      isHover: i === 1,
    }));

    try {
      if (isEditing) {
        // ── EDIT MODE ────────────────────────────────────────────────
        setSaveStep('Updating product info…');

        await apiClient.patch(`/products/${product!.id}`, {
          name,
          sku: sku.trim(),
          subcategoryId,
          price: Number(price),
          description: description.trim(),
          netWeightGrams: Number(netWeightGrams),
          totalDiamondCt: Number(totalDiamondCt),
          smallDiamondCt: Number(smallDiamondCt),
          totalDiamondPcs: Number(totalDiamondPcs),
          diamondGrade: diamondGrade || null,
          isPublished,
          inStock,
          images: imagesPayload,
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

        // Step 1: Create product with its shared gallery
        const prodRes = await apiClient.post('/products', {
          name,
          sku: sku.trim(),
          subcategoryId,
          price: Number(price),
          description: description.trim(),
          netWeightGrams: Number(netWeightGrams),
          totalDiamondCt: Number(totalDiamondCt),
          smallDiamondCt: Number(smallDiamondCt),
          totalDiamondPcs: Number(totalDiamondPcs),
          diamondGrade: diamondGrade || null,
          isPublished,
          inStock,
          images: imagesPayload,
        });

        const newProduct: Product = prodRes.data.data || prodRes.data;

        // Step 2: Create the selected metal finishes
        for (const s of enabledMetals) {
          setSaveStep(`Creating ${s.metalFinish} variant…`);

          const vRes = await apiClient.post(`/products/${newProduct.id}/variants`, {
            metalFinish: s.metalFinish,
            swatchColor: s.swatchColor,
            isDefault: s.metalFinish === 'Yellow Gold',
            inStock: true,
          });
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
              label="Product Title *"
              placeholder="e.g. Solitaire Diamond Ring"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU Code *"
              placeholder="HOS-RNG-001"
              value={sku}
              onChange={e => setSku(e.target.value)}
              required
            />
            <Select
              label="Subcategory *"
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              required
              options={[
                { value: '', label: 'Select subcategory' },
                ...subcategoryOptions,
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (₹ INR) *"
              type="number"
              min="1"
              placeholder="45000"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
            />
          </div>
        </div>

        {/* ── Section 2: Diamond Specs ─────────────────────────────── */}
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-graphite-700">
            <Gem className="h-4 w-4 text-brand-700" /> Diamond &amp; Crafting Specifications
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Net Weight (g) *" type="number" step="0.01" min="0" required placeholder="3.20" value={netWeightGrams} onChange={e => setNetWeightGrams(e.target.value)} />
            <Input label="Total Diamond Weight (ct) *" type="number" step="0.001" min="0" required placeholder="0.85" value={totalDiamondCt} onChange={e => setTotalDiamondCt(e.target.value)} />
            <Input label="Small Diamond Weight (ct) *" type="number" step="0.001" min="0" required placeholder="0.25" value={smallDiamondCt} onChange={e => setSmallDiamondCt(e.target.value)} />
            <Input label="Total Diamond Pieces *" type="number" min="1" step="1" required placeholder="21" value={totalDiamondPcs} onChange={e => setTotalDiamondPcs(e.target.value)} />
          </div>
          <p className="text-[11px] text-graphite-500 italic">Shown on the website under Product Details. Standard: 24K Gold Vermeil over BIS hallmarked sterling silver; all diamonds IGI certified, EF colour, VVS-VS clarity.</p>
        </div>

        {/* ── Section 3: Description ───────────────────────────────── */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-graphite-700">Description *</label>
          <textarea
            rows={3}
            required
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
                <ImageIcon className="h-4 w-4 text-brand-700" /> Metal Finishes &amp; Product Images
              </div>
              <p className="text-[11px] text-graphite-500 mt-0.5">
                Choose the available finishes, then upload up to 5 images at once. Images are shared by every finish.
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
                onClick={() => (!isEditing || !s.variantId) && toggleMetal(s.metalFinish)}
                title={isEditing && s.variantId ? 'Existing finish' : undefined}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors',
                  s.enabled
                    ? 'bg-white border-graphite-300 text-graphite-800 shadow-sm'
                    : 'bg-graphite-100 border-graphite-200 text-graphite-400',
                  isEditing && s.variantId ? 'cursor-default' : 'cursor-pointer hover:border-brand-400',
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
            <span className="text-[10px] text-graphite-400 ml-1">Click to toggle</span>
          </div>

          {/* Shared gallery — not tied to a metal finish */}
          <div className="rounded-lg border border-graphite-200 bg-white p-3 space-y-3">
            <div className="text-xs font-bold text-graphite-800">PRODUCT IMAGES</div>
            <ProductGalleryUploader images={galleryImages} onChange={setGalleryImages} />
          </div>
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
