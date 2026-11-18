import React from 'react';
import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

export interface StatTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changePeriod?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'brand' | 'warning' | 'success';
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  title,
  value,
  subtitle,
  change,
  changePeriod,
  icon: Icon,
  variant = 'default',
  className,
}) => {
  const getIconStyles = () => {
    switch (variant) {
      case 'brand':
        return 'bg-brand-50 text-brand-700';
      case 'warning':
        return 'bg-amber-50 text-amber-600';
      case 'success':
        return 'bg-emerald-50 text-emerald-600';
      default:
        return 'bg-graphite-100 text-graphite-600';
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-graphite-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-graphite-500">{title}</p>
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', getIconStyles())}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-graphite-900">{value}</p>
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold',
              change >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="mr-0.5 h-3 w-3" />
            ) : (
              <TrendingDown className="mr-0.5 h-3 w-3" />
            )}
            {change >= 0 ? `+${change}%` : `${change}%`}
          </span>
        )}
      </div>

      {(subtitle || changePeriod) && (
        <p className="mt-1 text-xs text-graphite-500">
          {changePeriod ? `${changePeriod}` : subtitle}
        </p>
      )}
    </div>
  );
};
