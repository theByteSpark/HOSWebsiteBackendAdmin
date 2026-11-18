import React from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
  breadcrumbs,
  className,
}) => {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-1">
        {breadcrumbs && (
          <nav className="flex items-center gap-1.5 text-xs text-graphite-400">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-graphite-700">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-graphite-600 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-graphite-900 sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-sm text-graphite-500">{description}</p>}
      </div>

      {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
    </div>
  );
};
