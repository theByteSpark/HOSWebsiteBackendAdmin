import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductEditorModal } from './ProductEditorModal';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Product, ProductCategory } from '@/types';
import { Plus, Gem, Check, Eye, Loader2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/Modal';

// Thumbnail cell — shows a spinner until the image loads, Gem icon on failure
const ProductThumb: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-graphite-100 overflow-hidden border border-graphite-200">
      {failed ? (
        <Gem className="h-4 w-4 text-graphite-400" />
      ) : (
        <>
          {!loaded && <Loader2 className="absolute h-3.5 w-3.5 animate-spin text-graphite-400" />}
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [publishedFilter, setPublishedFilter] = useState<string>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch categories
  const { data: categoriesData } = useQuery<{ categories: ProductCategory[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data || res.data;
    },
  });

  const categories = categoriesData?.categories || [];

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/products/${deletingProduct.id}`);
      setDeletingProduct(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete product', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch products
  const { data, isLoading, refetch } = useQuery<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['products', page, search, categoryFilter, publishedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(categoryFilter !== 'ALL' ? { categoryId: categoryFilter } : {}),
        ...(publishedFilter !== 'ALL' ? { isPublished: publishedFilter } : {}),
      });
      const res = await apiClient.get(`/products?${params.toString()}`);
      return res.data.data || res.data;
    },
  });

  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  const handleTogglePublish = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/products/${p.id}/publish`, { isPublished: !p.isPublished });
      refetch();
    } catch (err) {
      console.error('Failed to toggle publish', err);
    }
  };

  const columns: Column<Product>[] = [
    {
      header: 'Jewelry Piece',
      accessor: (row) => {
        // Find primary image: Yellow Gold primary → any Yellow Gold → any variant primary → first image
        const ygVariant = row.variants?.find(v => v.metalFinish === 'Yellow Gold');
        const pick = (img?: { url: string; thumbnailUrl?: string | null } | null) =>
          img ? (img.thumbnailUrl || img.url) : null;
        const primaryImg =
          pick(ygVariant?.images?.find(i => i.isPrimary)) ||
          pick(ygVariant?.images?.[0]) ||
          pick(row.variants?.flatMap(v => v.images || []).find(i => i.isPrimary)) ||
          pick(row.variants?.flatMap(v => v.images || [])[0]) ||
          pick(row.images?.[0]) || null;
        return (
        <div className="flex items-center gap-3">
          {primaryImg ? (
            <ProductThumb key={primaryImg} src={primaryImg} alt={row.name} />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-graphite-100 overflow-hidden border border-graphite-200">
              <Gem className="h-4 w-4 text-graphite-400" />
            </div>
          )}
          <div>
            <p className="font-bold text-graphite-900">{row.name}</p>
            <p className="text-xs text-graphite-400">SKU: {row.sku || '—'}</p>
          </div>
        </div>
        );
      },
    },
    {
      header: 'Category',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700">
          {row.category?.name || '—'}
        </span>
      ),
    },
    {
      header: 'Diamond / Weight',
      accessor: (row) => (
        <div className="text-xs text-graphite-600">
          {row.totalDiamondCt ? <p>{row.totalDiamondCt} ct diamond</p> : null}
          {row.netWeightGrams ? <p className="text-[11px] text-graphite-400">{row.netWeightGrams}g net</p> : null}
          {!row.totalDiamondCt && !row.netWeightGrams && <span>—</span>}
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: (row) => (
        <span className="font-bold text-graphite-900">{formatCurrency(row.price)}</span>
      ),
    },
    {
      header: 'Stock Status',
      accessor: (row) => (
        <StatusBadge status={row.inStock ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      header: 'Website Status',
      accessor: (row) => (
        <button
          type="button"
          onClick={(e) => handleTogglePublish(row, e)}
          className="cursor-pointer"
        >
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setEditingProduct(row);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingProduct(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Catalog"
        description="Manage House of Seya luxury jewelry items, diamond attributes, and publishing."
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-graphite-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search jewelry by name or SKU..."
            className="w-full sm:max-w-xs"
          />

          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 text-xs"
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            value={publishedFilter}
            onChange={(e) => {
              setPublishedFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-36 text-xs"
            options={[
              { value: 'ALL', label: 'All Visibility' },
              { value: 'true', label: 'Published Only' },
              { value: 'false', label: 'Draft Only' },
            ]}
          />
        </div>
      </div>

      {/* Products Table */}
      <Table
        columns={columns}
        data={products}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => {
          setEditingProduct(row);
          setIsModalOpen(true);
        }}
        isLoading={isLoading}
        emptyMessage="No jewelry products found."
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={15}
        onPageChange={setPage}
      />

      {/* Product Editor Modal */}
      <ProductEditorModal
        product={editingProduct}
        categories={categories}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action will remove the product from active inventory.`}
        confirmText="Delete Product"
        isLoading={isDeleting}
      />
    </div>
  );
};
