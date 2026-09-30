import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/cn';
import {
  Gem,
  Globe,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Layout,
  Home,
  Info,
  Gift,
  Sliders,
  BookOpen,
  FileText,
  FolderTree,
  HelpCircle,
  Star,
  Image as ImageIcon,
  History,
  Users,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const navGroups: NavGroup[] = [
    {
      key: 'pages',
      label: 'PAGE CONTENT EDITORS',
      items: [
        { label: 'Home Page', to: '/website?tab=home', icon: Home },
        { label: 'About Page', to: '/website?tab=about', icon: Info },
        { label: 'Gifting Page', to: '/website?tab=gifting', icon: Gift },
        { label: 'Customise Page', to: '/website?tab=customise', icon: Sliders },
        { label: 'Diamond Education', to: '/website?tab=diamond-education', icon: BookOpen },
        { label: 'Gold Vermeil', to: '/website?tab=gold-vermeil', icon: Sparkles },
        { label: 'Blogs', to: '/website?tab=blogs', icon: FileText },
      ],
    },
    {
      key: 'commerce',
      label: 'COMMERCE CONTENT',
      items: [
        { label: 'Products', to: '/products', icon: Gem },
        { label: 'Collections', to: '/website?tab=collections', icon: FolderTree },
        { label: 'FAQs', to: '/website?tab=faqs', icon: HelpCircle },
        { label: 'Reviews', to: '/website?tab=reviews', icon: Star },
      ],
    },
    {
      key: 'admin',
      label: 'ADMINISTRATION & AUDIT',
      items: [
        { label: 'Admin Users', to: '/settings?tab=users', icon: Users },
        { label: 'Audit Logs', to: '/settings?tab=audit', icon: History },
        { label: 'Site Settings', to: '/settings?tab=site', icon: Settings },
      ],
    },
  ];

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const mobilePrimaryItems = [
    { label: 'Home', to: '/website?tab=home', icon: Home },
    { label: 'Products', to: '/products', icon: Gem },
    { label: 'Users', to: '/settings?tab=users', icon: Users },
    { label: 'Audit', to: '/settings?tab=audit', icon: History },
  ];

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
              <p className="text-sm font-bold tracking-tight text-graphite-900 truncate">HOS</p>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] font-medium text-graphite-400 truncate">Visual Content Manager</p>
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
                    className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-graphite-400 hover:text-graphite-700 transition-colors"
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
                      const currentUrl = location.pathname + location.search;
                      const isItemActive = item.to.includes('?tab=')
                        ? currentUrl === item.to
                        : location.pathname === item.to;

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={() =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all',
                              isItemActive
                                ? 'bg-brand-50 text-brand-800 font-bold shadow-2xs border border-brand-200/60'
                                : 'text-graphite-600 hover:bg-graphite-100/70 hover:text-graphite-900'
                            )
                          }
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isItemActive ? 'text-brand-700' : 'text-graphite-400 group-hover:text-graphite-600'
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
              {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-graphite-900">{user?.name || 'Administrator'}</p>
              {user?.email && (
                <p className="truncate text-[10px] font-medium text-graphite-500 font-mono">{user.email}</p>
              )}
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
            <p className="text-xs font-bold text-graphite-900 leading-tight">HOS</p>
            <p className="text-[10px] font-medium text-graphite-400 leading-tight">Content Editor</p>
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-graphite-200 bg-white py-1 lg:hidden shadow-lg">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
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
      </nav>
    </div>
  );
};
