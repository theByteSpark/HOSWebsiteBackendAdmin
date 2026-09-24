import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Customer } from '@/types';
import { MessageSquare } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery<{
    customers: Customer[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['customers', page, search, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(sourceFilter !== 'ALL' ? { source: sourceFilter } : {}),
      });
      const res = await apiClient.get(`/customers?${params.toString()}`);
      return res.data.data || res.data;
    },
  });

  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  const columns: Column<Customer>[] = [
    {
      header: 'Customer',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.name}</p>
          <p className="text-xs text-graphite-400">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Phone / WhatsApp',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-graphite-700">{row.phone || row.whatsapp || '—'}</span>
          {row.whatsapp && (
            <a
              href={`https://wa.me/${row.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-emerald-600 hover:text-emerald-700"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ),
    },
    {
      header: 'Source',
      accessor: (row) => (
        <span className="text-xs font-semibold uppercase text-graphite-600 tracking-wider">
          {row.source || 'Direct'}
        </span>
      ),
    },
    {
      header: 'Orders',
      accessor: (row) => (
        <span className="font-semibold text-graphite-800">{row.orderCount || 0} orders</span>
      ),
    },
    {
      header: 'Lifetime Value',
      accessor: (row) => (
        <span className="font-bold text-graphite-900">{formatCurrency(row.totalOrderValue)}</span>
      ),
    },
    {
      header: 'Created',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer CRM"
        description="Directory of House of Seya clients, order history, and lifetime value."
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
            placeholder="Search customers by name, email, phone..."
            className="w-full sm:max-w-xs"
          />

          <Select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40 text-xs"
            options={[
              { value: 'ALL', label: 'All Sources' },
              { value: 'WHATSAPP', label: 'WhatsApp' },
              { value: 'WEBSITE', label: 'Website' },
              { value: 'WALK_IN', label: 'Walk In' },
              { value: 'REFERRAL', label: 'Referral' },
            ]}
          />
        </div>
      </div>

      {/* Customers Table */}
      <Table
        columns={columns}
        data={customers}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setSelectedCustomer(row)}
        isLoading={isLoading}
        emptyMessage="No customers found matching search criteria."
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
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
};
