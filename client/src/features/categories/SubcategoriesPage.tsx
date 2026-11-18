import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { ProductCategory, Subcategory } from '@/types';
import { Plus } from 'lucide-react';
import { SubcategoryModal } from './CategoryModals';

export const SubcategoriesPage: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Subcategory | null>(null);
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
  const subcategories: Subcategory[] = categories
    .filter((c) => categoryFilter === 'ALL' || c.id === categoryFilter)
    .flatMap((c) => (c.subcategories || []).map((s) => ({ ...s, categoryId: c.id, category: c })));

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/subcategories/${deleting.id}`);
      setDeleting(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete subcategory.');
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Subcategory>[] = [
    {
      header: 'Subcategory',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.name}</p>
          <p className="font-mono text-xs text-graphite-400">/{row.slug}</p>
        </div>
      ),
    },
    {
      header: 'Parent Category',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700">{row.category?.name || '—'}</span>
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
        title="Subcategories"
        description="Subcategories grouped under each main category."
        action={
          <Button
            size="sm"
            disabled={categories.length === 0}
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Subcategory
          </Button>
        }
      />

      <div className="flex items-center rounded-xl border border-graphite-200 bg-white p-4 shadow-xs">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full text-xs sm:w-56"
          options={[
            { value: 'ALL', label: 'All Categories' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{errorMsg}</div>
      )}

      <Table
        columns={columns}
        data={subcategories}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => {
          setEditing(row);
          setIsModalOpen(true);
        }}
        isLoading={isLoading}
        emptyMessage="No subcategories yet."
      />

      {isModalOpen && (
        <SubcategoryModal
          subcategory={editing}
          categories={categories}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={refetch}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Subcategory"
        message={`Are you sure you want to delete "${deleting?.name}"?`}
        confirmText="Delete Subcategory"
        isLoading={isDeleting}
      />
    </div>
  );
};
