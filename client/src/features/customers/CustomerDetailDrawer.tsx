import React from 'react';
import { Drawer } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Customer, Order } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { User, Phone, Mail, MessageSquare, ShoppingBag, MapPin, Tag } from 'lucide-react';

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  if (!customer) return null;

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['customer-orders', customer.id],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${customer.id}/orders`);
      return res.data.data || res.data;
    },
    enabled: !!customer.id,
  });

  const orders = ordersData?.orders || [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      description={`Customer since ${formatDate(customer.createdAt)}`}
      width="lg"
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-graphite-500">Lifetime Value</p>
          <p className="text-lg font-bold text-graphite-900 mt-0.5">{formatCurrency(customer.totalOrderValue)}</p>
        </div>
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-graphite-500">Total Orders</p>
          <p className="text-lg font-bold text-graphite-900 mt-0.5">{customer.orderCount} orders</p>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-graphite-500">Contact Information</h4>
        <div className="rounded-xl border border-graphite-200 bg-white p-4 space-y-2 text-xs text-graphite-700">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-graphite-400" />
            <span>{customer.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-graphite-400" />
            <span>{customer.email || 'No email recorded'}</span>
          </div>
          {customer.whatsapp && (
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md hover:bg-emerald-100"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tags & Source */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-graphite-500">Tags & Source</h4>
        <div className="rounded-xl border border-graphite-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-graphite-500">Acquisition Source:</span>
            <span className="font-bold text-graphite-800 uppercase">{customer.source || 'Direct'}</span>
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customer.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-graphite-100 px-2 py-0.5 text-[11px] font-semibold text-graphite-700"
                >
                  <Tag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          )}
          {customer.notes && (
            <div className="pt-2 border-t border-graphite-100 text-xs text-graphite-600">
              <p className="font-semibold text-graphite-800">Internal Notes:</p>
              <p className="mt-0.5 italic">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="space-y-2.5">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-graphite-500">
          <ShoppingBag className="h-3.5 w-3.5" /> Order History ({orders.length})
        </h4>
        <div className="rounded-xl border border-graphite-200 bg-white divide-y divide-graphite-100 overflow-hidden">
          {ordersLoading ? (
            <p className="p-4 text-xs text-graphite-400">Loading order history...</p>
          ) : orders.length === 0 ? (
            <p className="p-4 text-xs text-graphite-400 text-center">No previous orders on record</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-graphite-900">{o.orderNumber}</p>
                  <p className="text-[11px] text-graphite-400">{formatDate(o.createdAt)} via {o.channel}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-bold text-graphite-900">{formatCurrency(o.total)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
};
