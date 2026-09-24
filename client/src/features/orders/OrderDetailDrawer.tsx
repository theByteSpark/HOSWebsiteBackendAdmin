import React, { useState } from 'react';
import { Drawer } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { apiClient } from '@/lib/apiClient';
import type { Order, OrderStatus, PaymentStatus } from '@/types';
import {
  MessageSquare,
  Package,
  Truck,
  CreditCard,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface OrderDetailDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  if (!order) return null;

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [courier, setCourier] = useState(order.courier || '');

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      await apiClient.patch(`/orders/${order.id}/status`, { status });
      onOrderUpdated();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTracking = async () => {
    setIsUpdating(true);
    try {
      await apiClient.patch(`/orders/${order.id}/tracking`, { trackingNumber, courier });
      onOrderUpdated();
    } catch (err) {
      console.error('Failed to update tracking', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Order ${order.orderNumber}`}
      description={`Received on ${formatDateTime(order.createdAt)} via ${order.channel}`}
      width="xl"
    >
      {/* Quick Status Control */}
      <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-graphite-500">Order Status</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="text-xs"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'IN_PRODUCTION', label: 'In Production' },
              { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <Button
            size="sm"
            onClick={handleUpdateStatus}
            disabled={status === order.status || isUpdating}
            isLoading={isUpdating}
          >
            Update
          </Button>
        </div>
      </div>

      {/* Customer Information */}
      <div className="space-y-2.5">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-graphite-500">
          <User className="h-4 w-4 text-graphite-400" /> Customer Information
        </h4>
        <div className="rounded-xl border border-graphite-200 bg-white p-4 space-y-2 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-graphite-900">{order.customer?.name}</p>
              <p className="text-xs text-graphite-500">{order.customer?.phone || 'No phone'}</p>
              <p className="text-xs text-graphite-500">{order.customer?.email || 'No email'}</p>
            </div>
            {order.customer?.whatsapp && (
              <a
                href={`https://wa.me/${order.customer.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md hover:bg-emerald-100"
              >
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-2.5">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-graphite-500">
          <Package className="h-4 w-4 text-graphite-400" /> Ordered Items ({order.items?.length || 0})
        </h4>
        <div className="rounded-xl border border-graphite-200 bg-white divide-y divide-graphite-100 overflow-hidden">
          {order.items?.map((item) => (
            <div key={item.id} className="p-3.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-graphite-900">{item.productName}</p>
                <div className="flex items-center gap-2 text-xs text-graphite-500 mt-0.5">
                  {item.metalFinish && <span>Finish: {item.metalFinish}</span>}
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-graphite-900">{formatCurrency(item.lineTotal)}</p>
                <p className="text-xs text-graphite-400">@{formatCurrency(item.unitPrice)}</p>
              </div>
            </div>
          ))}

          {/* Pricing summary */}
          <div className="bg-graphite-50/60 p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-graphite-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-graphite-600">
              <span>Tax / GST</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-graphite-900 pt-2 border-t border-graphite-200">
              <span>Total Amount</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & Fulfillment */}
      <div className="space-y-2.5">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-graphite-500">
          <Truck className="h-4 w-4 text-graphite-400" /> Fulfillment & Logistics
        </h4>
        <div className="rounded-xl border border-graphite-200 bg-white p-4 space-y-3 text-sm">
          {order.shippingAddress && (
            <div className="text-xs text-graphite-600 space-y-0.5">
              <p className="font-semibold text-graphite-800">Shipping Address:</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-graphite-100">
            <div>
              <label className="text-[11px] font-semibold text-graphite-500">Courier Partner</label>
              <input
                type="text"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="e.g. BlueDart, Delhivery"
                className="mt-1 h-8 w-full rounded-md border border-graphite-300 px-2.5 text-xs text-graphite-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-graphite-500">Tracking AWB #</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD123456789"
                className="mt-1 h-8 w-full rounded-md border border-graphite-300 px-2.5 text-xs text-graphite-900"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={handleSaveTracking} isLoading={isUpdating}>
              Save Tracking
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
