import React from 'react';
import { cn } from '@/lib/cn';
import type { OrderStatus, PaymentStatus, AdminRole } from '@/types';

export interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | AdminRole | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStyles = () => {
    switch (status) {
      // Order Statuses
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PRODUCTION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'READY_TO_SHIP':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SHIPPED':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'RETURNED':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      // Payment Statuses
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNPAID':
        return 'bg-graphite-100 text-graphite-700 border-graphite-200';
      case 'REFUNDED':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      // Roles
      case 'SUPER_ADMIN':
        return 'bg-brand-100 text-brand-800 border-brand-300 font-bold';
      case 'ADMIN':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'MANAGER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'STAFF':
        return 'bg-graphite-100 text-graphite-700 border-graphite-200';

      // Generic
      case 'true':
      case 'ACTIVE':
      case 'PUBLISHED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'false':
      case 'INACTIVE':
      case 'DRAFT':
        return 'bg-graphite-100 text-graphite-600 border-graphite-200';

      default:
        return 'bg-graphite-100 text-graphite-700 border-graphite-200';
    }
  };

  const getLabel = () => {
    return status.replace(/_/g, ' ');
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border uppercase',
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
};
