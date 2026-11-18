import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import type { DashboardStats, Order } from '@/types';
import {
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  Star,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/dashboard');
      return res.data.data || res.data;
    },
    refetchInterval: 30000,
  });

  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/orders?limit=5');
      return res.data.data || res.data;
    },
  });

  const recentOrders = recentOrdersData?.orders || [];

  const orderColumns: Column<Order>[] = [
    {
      header: 'Order #',
      accessor: (row) => (
        <span className="font-semibold text-graphite-900">{row.orderNumber}</span>
      ),
    },
    {
      header: 'Customer',
      accessor: (row) => (
        <div>
          <p className="font-medium text-graphite-900">{row.customer?.name || 'Guest'}</p>
          <p className="text-xs text-graphite-400">{row.customer?.phone || row.customer?.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Channel',
      accessor: (row) => (
        <span className="text-xs font-semibold uppercase text-graphite-600 tracking-wide">
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
        title="Business Dashboard"
        description="Live operational overview of House of Seya sales, inventory & orders."
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          title="Revenue (Last 30 Days)"
          value={isLoading ? '—' : formatCurrency(stats?.revenue30d ?? 0)}
          subtitle={`MTD: ${formatCurrency(stats?.revenueMtd ?? 0)} | YTD: ${formatCurrency(stats?.revenueYtd ?? 0)}`}
          change={stats?.revenueChange30d}
          changePeriod="vs previous 30d"
          icon={IndianRupee}
          variant="brand"
        />

        <StatTile
          title="Orders (Last 30 Days)"
          value={isLoading ? '—' : formatNumber(stats?.orderCount30d ?? 0)}
          subtitle={`Today: ${formatNumber(stats?.orderCountToday ?? 0)} orders`}
          icon={ShoppingBag}
        />

        <StatTile
          title="Low Stock Alerts"
          value={isLoading ? '—' : formatNumber(stats?.lowStockCount ?? 0)}
          subtitle="Items needing restock"
          icon={AlertTriangle}
          variant={(stats?.lowStockCount ?? 0) > 0 ? 'warning' : 'default'}
        />

        <StatTile
          title="Pending Customer Reviews"
          value={isLoading ? '—' : formatNumber(stats?.pendingReviewsCount ?? 0)}
          subtitle="Awaiting moderation"
          icon={Star}
        />
      </div>

      {/* Secondary Metrics & Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Status Distribution */}
        <div className="rounded-xl border border-graphite-200 bg-white p-5 shadow-xs lg:col-span-1">
          <h3 className="text-sm font-bold text-graphite-900">Order Status Breakdown</h3>
          <p className="text-xs text-graphite-500 mt-0.5">Distribution of current active pipeline</p>

          <div className="mt-4 space-y-2.5">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 w-full bg-graphite-100 animate-pulse rounded-md" />
                ))}
              </div>
            ) : !stats?.ordersByStatus || Object.keys(stats.ordersByStatus).length === 0 ? (
              <p className="py-6 text-center text-xs text-graphite-400">No active orders in pipeline</p>
            ) : (
              Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs py-1 border-b border-graphite-50">
                  <StatusBadge status={status} />
                  <span className="font-bold text-graphite-800">{count} orders</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders Overview */}
        <div className="rounded-xl border border-graphite-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-graphite-900">Recent Customer Orders</h3>
              <p className="text-xs text-graphite-500">Latest orders received across WhatsApp and website</p>
            </div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Table
            columns={orderColumns}
            data={recentOrders}
            keyExtractor={(row) => row.id}
            isLoading={ordersLoading}
            emptyMessage="No customer orders received yet."
          />
        </div>
      </div>
    </div>
  );
};
