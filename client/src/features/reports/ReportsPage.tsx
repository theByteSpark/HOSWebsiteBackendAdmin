import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Modal';
import { StatTile } from '@/components/ui/StatTile';
import { Table, Column } from '@/components/ui/Table';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import {
  Download,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  BarChart2,
  Calendar,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [timeframe, setTimeframe] = useState('30d');

  // Revenue Report Data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['report-revenue', timeframe],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/revenue?timeframe=${timeframe}`);
      return res.data.data || res.data;
    },
    enabled: activeTab === 'revenue',
  });

  // Top Products Report Data
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['report-products', timeframe],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/products?timeframe=${timeframe}`);
      return res.data.data || res.data;
    },
    enabled: activeTab === 'products',
  });

  // Inventory Valuation Report Data
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/inventory');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'inventory',
  });

  const productReportColumns: Column<any>[] = [
    {
      header: 'Product Name',
      accessor: (row) => <span className="font-bold text-graphite-900">{row.name}</span>,
    },
    {
      header: 'Category',
      accessor: (row) => <span className="text-xs text-graphite-600">{row.categoryName || '—'}</span>,
    },
    {
      header: 'Units Sold',
      accessor: (row) => <span className="font-semibold text-graphite-800">{row.unitsSold || 0}</span>,
    },
    {
      header: 'Total Revenue Generated',
      accessor: (row) => (
        <span className="font-bold text-graphite-900">{formatCurrency(row.totalRevenue)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Analytics & Reports"
        description="Comprehensive reports on revenue performance, product sales, and inventory valuation."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-xs w-36"
              options={[
                { value: 'today', label: 'Today' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: 'mtd', label: 'Month to Date' },
                { value: 'ytd', label: 'Year to Date' },
              ]}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => alert('Exporting report as CSV...')}
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'revenue', label: 'Revenue Report' },
          { id: 'products', label: 'Product Sales' },
          { id: 'inventory', label: 'Inventory Valuation' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Revenue */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              title="Period Total Revenue"
              value={revenueLoading ? '—' : formatCurrency(revenueData?.totalRevenue ?? 0)}
              subtitle={`Timeframe: ${timeframe.toUpperCase()}`}
              icon={IndianRupee}
              variant="brand"
            />
            <StatTile
              title="Period Order Volume"
              value={revenueLoading ? '—' : formatNumber(revenueData?.orderCount ?? 0)}
              subtitle="Completed & active customer orders"
              icon={ShoppingBag}
            />
            <StatTile
              title="Average Order Value (AOV)"
              value={revenueLoading ? '—' : formatCurrency(revenueData?.averageOrderValue ?? 0)}
              subtitle="Per transaction average"
              icon={TrendingUp}
            />
          </div>

          <div className="rounded-xl border border-graphite-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-graphite-900 mb-2">Revenue Timeline Breakdown</h3>
            {revenueLoading ? (
              <p className="text-xs text-graphite-400 py-8 text-center">Loading revenue analytics...</p>
            ) : !revenueData?.breakdown || revenueData.breakdown.length === 0 ? (
              <p className="text-xs text-graphite-400 py-8 text-center">
                No recorded sales in selected period.
              </p>
            ) : (
              <div className="divide-y divide-graphite-100">
                {revenueData.breakdown.map((b: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2.5 text-xs">
                    <span className="font-semibold text-graphite-800">{b.date}</span>
                    <span className="font-bold text-graphite-900">{formatCurrency(b.revenue)} ({b.orders} orders)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <Table
            columns={productReportColumns}
            data={productsData?.products || []}
            keyExtractor={(row) => row.id}
            isLoading={productsLoading}
            emptyMessage="No product sales records found for this period."
          />
        </div>
      )}

      {/* Tab: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              title="Total Inventory Valuation"
              value={inventoryLoading ? '—' : formatCurrency(inventoryData?.totalValuation ?? 0)}
              subtitle="Based on retail price * on-hand quantity"
              icon={IndianRupee}
              variant="brand"
            />
            <StatTile
              title="Total Physical Items On Hand"
              value={inventoryLoading ? '—' : formatNumber(inventoryData?.totalUnits ?? 0)}
              subtitle="Units across all jewelry lines"
              icon={ShoppingBag}
            />
          </div>
        </div>
      )}
    </div>
  );
};
