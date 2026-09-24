import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { InventoryItem } from '@/types';
import { Boxes, AlertTriangle, ArrowUpDown, History } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState<string>('ALL');
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  const { data, isLoading, refetch } = useQuery<{
    items: InventoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['inventory', page, search, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(lowStockOnly === 'LOW_STOCK' ? { lowStock: 'true' } : {}),
      });
      const res = await apiClient.get(`/inventory?${params.toString()}`);
      return res.data.data || res.data;
    },
  });

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.product?.name}</p>
          <p className="text-xs text-graphite-400">SKU: {row.product?.sku || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (row) => (
        <span className="text-xs text-graphite-600">
          {row.product?.category?.name || '—'}
        </span>
      ),
    },
    {
      header: 'Current Stock',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <span
            className={`font-bold text-sm ${
              row.quantity <= row.reorderLevel ? 'text-amber-600' : 'text-graphite-900'
            }`}
          >
            {row.quantity} units
          </span>
          {row.quantity <= row.reorderLevel && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <AlertTriangle className="h-3 w-3" /> Low
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Reorder Level',
      accessor: (row) => (
        <span className="text-xs text-graphite-500">{row.reorderLevel} units</span>
      ),
    },
    {
      header: 'Stock Status',
      accessor: (row) => (
        <StatusBadge status={row.quantity > 0 ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      header: 'Last Updated',
      accessor: (row) => (
        <span className="text-xs text-graphite-500">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setAdjustingItem(row);
          }}
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Adjust Stock
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Stock Management"
        description="Monitor luxury diamond stock levels, track reorder thresholds, and log stock movements."
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
            placeholder="Search inventory by product name or SKU..."
            className="w-full sm:max-w-xs"
          />

          <Select
            value={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 text-xs"
            options={[
              { value: 'ALL', label: 'All Stock Levels' },
              { value: 'LOW_STOCK', label: 'Low Stock Only' },
            ]}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <Table
        columns={columns}
        data={items}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No inventory items found."
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={15}
        onPageChange={setPage}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        item={adjustingItem}
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        onSaved={refetch}
      />
    </div>
  );
};
