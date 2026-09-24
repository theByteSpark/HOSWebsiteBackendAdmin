import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Gem,
  Boxes,
  BarChart3,
  Globe,
  Settings,
  LogOut,
  ChevronDown,
  MoreHorizontal,
  Bell,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  end?: boolean;
}

interface NavGroup {
  key: string;
  label?: string;
  items: NavItem[];
}

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const navGroups: NavGroup[] = [
    {
      key: 'core',
      items: [
        { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      items: [
        { label: 'Orders', to: '/orders', icon: ShoppingBag },
        { label: 'Customers', to: '/customers', icon: Users },
        { label: 'Products', to: '/products', icon: Gem },
        { label: 'Inventory', to: '/inventory', icon: Boxes },
        { label: 'Reports', to: '/reports', icon: BarChart3 },
      ],
    },
    {
      key: 'management',
      label: 'Platform',
      items: [
        { label: 'Website & CMS', to: '/website', icon: Globe },
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ];

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allItems = navGroups.flatMap((g) => g.items);
  const mobilePrimaryPaths = ['/', '/orders', '/products', '/inventory'];
  const mobilePrimaryItems = allItems.filter((item) => mobilePrimaryPaths.includes(item.to));
  const mobileMoreItems = allItems.filter((item) => !mobilePrimaryPaths.includes(item.to));

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8f9] lg:flex-row">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-graphite-200 bg-white lg:flex sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-graphite-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold tracking-tight text-white shadow-xs">
            HOS
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold tracking-tight text-graphite-900 truncate">House of Seya</p>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] font-medium text-graphite-400 truncate">Business Platform</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3.5 py-4">
          {navGroups.map((group) => {
            const isCollapsed = collapsed[group.key];
            return (
              <div key={group.key} className="space-y-1">
                {group.label && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-graphite-400 hover:text-graphite-700 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform duration-150', isCollapsed && '-rotate-90')}
                    />
                  </button>
                )}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all',
                              isActive
                                ? 'bg-brand-50 text-brand-800 font-bold shadow-2xs border border-brand-200/60'
                                : 'text-graphite-600 hover:bg-graphite-100/70 hover:text-graphite-900'
                            )
                          }
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                                ? 'text-brand-700'
                                : 'text-graphite-400 group-hover:text-graphite-600'
                            )}
                          />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="border-t border-graphite-200 bg-graphite-50/50 p-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white shadow-2xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-graphite-900">{user?.name || 'Administrator'}</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                {user?.role || 'SUPER_ADMIN'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-graphite-500 hover:bg-white hover:text-red-600 hover:shadow-2xs transition-all"
          >
            <LogOut className="h-4 w-4 text-graphite-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar (< lg) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-graphite-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">
            HOS
          </div>
          <div>
            <p className="text-xs font-bold text-graphite-900 leading-tight">House of Seya</p>
            <p className="text-[10px] font-medium text-graphite-400 leading-tight">Admin Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => logout()}
            className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-500 hover:bg-graphite-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile More Sheet */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-graphite-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-4 pb-8 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-graphite-200" />
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-graphite-400">All Modules</p>
            <div className="grid grid-cols-3 gap-2">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition-colors',
                        isActive ? 'bg-brand-50 text-brand-800' : 'text-graphite-600 hover:bg-graphite-50'
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate text-center">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-graphite-200 bg-white py-1 lg:hidden shadow-lg">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-brand-700' : 'text-graphite-500'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold text-graphite-500"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="truncate">More</span>
        </button>
      </nav>
    </div>
  );
};
