import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { thumbnailFor } from '@/lib/imageUrl';
import type { ProductCategory } from '@/types';
import { Plus, FolderTree } from 'lucide-react';
import { CategoryModal } from './CategoryModals';

export const CategoriesPage: React.FC = () => {
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ categories: ProductCategory[] }>({
    queryKey: ['categories-full'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data || res.data;
    },
  });

  const categories = data?.categories || [];

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/${deleting.id}`);
      setDeleting(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category.');
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<ProductCategory>[] = [
    {
      header: 'Category',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-graphite-200 bg-graphite-100">
            {row.image ? (
              <img src={thumbnailFor(row.image) || row.image} alt={row.name} className="h-full w-full object-cover" />
            ) : (
              <FolderTree className="h-4 w-4 text-graphite-400" />
            )}
          </div>
          <div>
            <p className="font-bold text-graphite-900">{row.name}</p>
            <p className="font-mono text-xs text-graphite-400">/{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Subcategories',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700">
          {row._count?.subcategories ?? row.subcategories?.length ?? 0}
        </span>
      ),
    },
    {
      header: 'Products',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700">{row._count?.products ?? '—'}</span>
      ),
    },
    {
      header: 'Sort',
      accessor: (row) => <span className="text-xs text-graphite-600">{row.sortOrder}</span>,
    },
    {
      header: 'Website Status',
      accessor: (row) => <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />,
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
              setEditing(row);
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
              setDeleting(row);
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
        title="Categories"
        description="Main product categories shown on the storefront."
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Category
          </Button>
        }
      />

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{errorMsg}</div>
      )}

      <Table
        columns={columns}
        data={categories}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => {
          setEditing(row);
          setIsModalOpen(true);
        }}
        isLoading={isLoading}
        emptyMessage="No categories yet."
      />

      {isModalOpen && (
        <CategoryModal
          category={editing}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={refetch}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleting?.name}"?`}
        confirmText="Delete Category"
        isLoading={isDeleting}
      />
    </div>
  );
};
