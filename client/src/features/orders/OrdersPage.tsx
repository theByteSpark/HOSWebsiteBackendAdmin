import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Order, OrderStatus } from '@/types';
import { Plus, Filter, Download } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, refetch } = useQuery<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['orders', page, search, statusFilter, channelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(channelFilter !== 'ALL' ? { channel: channelFilter } : {}),
      });
      const res = await apiClient.get(`/orders?${params.toString()}`);
      return res.data.data || res.data;
    },
  });

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  const columns: Column<Order>[] = [
    {
      header: 'Order #',
      accessor: (row) => (
        <span className="font-bold text-graphite-900">{row.orderNumber}</span>
      ),
    },
    {
      header: 'Customer',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-graphite-900">{row.customer?.name || 'Guest Customer'}</p>
          <p className="text-xs text-graphite-400">{row.customer?.phone || row.customer?.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Items',
      accessor: (row) => (
        <span className="text-xs font-medium text-graphite-600">
          {row.items?.length || 0} items
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Payment',
      accessor: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      header: 'Channel',
      accessor: (row) => (
        <span className="text-xs font-semibold uppercase text-graphite-500 tracking-wider">
          {row.channel}
        </span>
      ),
    },
    {
      header: 'Total',
      accessor: (row) => (
        <span className="font-bold text-graphite-900">{formatCurrency(row.total)}</span>
      ),
    },
    {
      header: 'Date',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders Management"
        description="Track customer orders across WhatsApp and website channels."
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
            placeholder="Search by order #, customer name, phone..."
            className="w-full sm:max-w-xs"
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40 text-xs"
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'IN_PRODUCTION', label: 'In Production' },
              { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />

          <Select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-36 text-xs"
            options={[
              { value: 'ALL', label: 'All Channels' },
              { value: 'WHATSAPP', label: 'WhatsApp' },
              { value: 'WEBSITE', label: 'Website' },
              { value: 'PHONE', label: 'Phone' },
              { value: 'WALK_IN', label: 'Walk In' },
            ]}
          />
        </div>
      </div>

      {/* Orders Table */}
      <Table
        columns={columns}
        data={orders}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setSelectedOrder(row)}
        isLoading={isLoading}
        emptyMessage="No customer orders found matching criteria."
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={15}
        onPageChange={setPage}
      />

      {/* Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={() => {
          refetch();
          if (selectedOrder) {
            // refresh selected order details
            apiClient.get(`/orders/${selectedOrder.id}`).then((res) => {
              setSelectedOrder(res.data.data || res.data);
            });
          }
        }}
      />
    </div>
  );
};
