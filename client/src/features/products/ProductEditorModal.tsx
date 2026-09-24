import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import type { Product, ProductCategory, Subcategory } from '@/types';
import { Gem, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ProductEditorModalProps {
  product: Product | null;
  categories: ProductCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSaved,
}) => {
  const isEditing = !!product;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [description, setDescription] = useState('');
  const [netWeightGrams, setNetWeightGrams] = useState('');
  const [totalDiamondCt, setTotalDiamondCt] = useState('');
  const [totalDiamondPcs, setTotalDiamondPcs] = useState('');
  const [diamondGrade, setDiamondGrade] = useState('EF VVS-VS');
  const [isPublished, setIsPublished] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSlug(product.slug || '');
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
      setImageUrl(product.images?.[0]?.url || '');
    } else {
      setName('');
      setSlug('');
      setSku('');
      setCategoryId(categories[0]?.id || '');
      setSubcategoryId('');
      setPrice('');
      setOriginalPrice('');
      setDescription('');
      setNetWeightGrams('');
      setTotalDiamondCt('');
      setTotalDiamondPcs('');
      setDiamondGrade('EF VVS-VS');
      setIsPublished(false);
      setInStock(true);
      setImageUrl('');
    }
    setError(null);
  }, [product, categories, isOpen]);

  const activeCategory = categories.find((c) => c.id === categoryId);
  const subcategories: Subcategory[] = activeCategory?.subcategories || [];

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      setError('Product Name, Category, and Price are mandatory.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      name,
      slug,
      sku: sku || undefined,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description: description || undefined,
      netWeightGrams: netWeightGrams ? Number(netWeightGrams) : undefined,
      totalDiamondCt: totalDiamondCt ? Number(totalDiamondCt) : undefined,
      totalDiamondPcs: totalDiamondPcs ? Number(totalDiamondPcs) : undefined,
      diamondGrade: diamondGrade || undefined,
      isPublished,
      inStock,
      images: imageUrl ? [{ url: imageUrl, isHover: false, sortOrder: 0 }] : undefined,
    };

    try {
      if (isEditing) {
        await apiClient.patch(`/products/${product.id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${product?.name}` : 'Create New Jewelry Product'}
      description="Jewelry specifications, diamond carat weights, metal finishes and pricing."
      maxWidth="2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Product Title"
            placeholder="e.g. Solitaire Diamond Ring"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <Input
            label="URL Slug"
            placeholder="solitaire-diamond-ring"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="SKU Code"
            placeholder="e.g. HOS-RNG-001"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
            }}
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Subcategory"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            options={[
              { value: '', label: 'None' },
              ...subcategories.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price (₹ INR)"
            type="number"
            placeholder="45000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Input
            label="Compare / Original Price (₹)"
            type="number"
            placeholder="55000"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
          />
        </div>

        {/* Jewelry Diamond & Metal Specifications */}
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-graphite-700">
            <Gem className="h-4 w-4 text-brand-700" /> Diamond & Crafting Specifications
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Net Weight (g)"
              type="number"
              step="0.01"
              placeholder="3.45"
              value={netWeightGrams}
              onChange={(e) => setNetWeightGrams(e.target.value)}
            />
            <Input
              label="Diamond Carat (ct)"
              type="number"
              step="0.001"
              placeholder="0.85"
              value={totalDiamondCt}
              onChange={(e) => setTotalDiamondCt(e.target.value)}
            />
            <Input
              label="Diamond Pieces"
              type="number"
              placeholder="1"
              value={totalDiamondPcs}
              onChange={(e) => setTotalDiamondPcs(e.target.value)}
            />
            <Input
              label="Diamond Grade"
              placeholder="EF VVS-VS"
              value={diamondGrade}
              onChange={(e) => setDiamondGrade(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-graphite-500 italic">
            Standard finishes: 24K Gold Vermeil, White Rhodium, Rose Gold Vermeil.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-graphite-700">Primary Product Image</label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://... or /uploads/products/solitaire.webp"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1"
            />
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-graphite-300 bg-graphite-50 px-3 py-2 text-xs font-semibold text-graphite-700 hover:bg-graphite-100 shrink-0">
              <ImageIcon className="h-3.5 w-3.5 text-graphite-500" /> Upload Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', 'products');
                    try {
                      const res = await apiClient.post('/media/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      const uploadedUrl = res.data.data?.url || res.data?.url;
                      if (uploadedUrl) {
                        setImageUrl(uploadedUrl);
                      }
                    } catch (err) {
                      console.error('Failed to upload image', err);
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the jewelry piece..."
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs text-graphite-900 focus:border-brand-600 focus:outline-hidden"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-graphite-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded-sm text-brand-700 focus:ring-brand-500"
            />
            <span>Publish on Website</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-graphite-700">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 rounded-sm text-brand-700 focus:ring-brand-500"
            />
            <span>In Stock</span>
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-graphite-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
