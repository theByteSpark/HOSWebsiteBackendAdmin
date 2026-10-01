import React, { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ImageUploader } from '@/components/ui/ImageUploader';
import type { ProductCategory, Subcategory } from '@/types';

export const CategoryModal: React.FC<{ category: ProductCategory | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ category, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(category?.name || '');
      setSlug(category?.slug || '');
      setImage(category?.image || '');
      setSortOrder(category?.sortOrder || 0);
      setIsPublished(category?.isPublished ?? true);
      setError(null);
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { name, slug: catSlug, image, sortOrder: Number(sortOrder), isPublished };
    try {
      if (category) {
        await apiClient.put(`/categories/${category.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'Add Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}
        <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

        <ImageUploader
          label="Category Cover Image"
          uploadContext="CATEGORY_COVER"
          value={image}
          onChange={(url) => setImage(url)}
        />

        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Category</Button>
        </div>
      </form>
    </Modal>
  );
};

export const SubcategoryModal: React.FC<{ subcategory: Subcategory | null; categories: ProductCategory[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ subcategory, categories, isOpen, onClose, onSaved }) => {
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCategoryId(subcategory?.categoryId || categories[0]?.id || '');
      setName(subcategory?.name || '');
      setSlug(subcategory?.slug || '');
      setSortOrder(subcategory?.sortOrder || 0);
      setIsPublished(subcategory?.isPublished ?? true);
      setError(null);
    }
  }, [subcategory, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const subSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { categoryId, name, slug: subSlug, sortOrder: Number(sortOrder), isPublished };
    try {
      if (subcategory) {
        await apiClient.put(`/categories/subcategories/${subcategory.id}`, payload);
      } else {
        await apiClient.post('/categories/subcategories', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save subcategory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subcategory ? 'Edit Subcategory' : 'Add Subcategory'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}
        <Select
          label="Parent Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          required
        />
        <Input label="Subcategory Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Subcategory</Button>
        </div>
      </form>
    </Modal>
  );
};
