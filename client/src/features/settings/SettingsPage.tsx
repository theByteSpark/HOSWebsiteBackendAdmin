import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/features/auth/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { formatDateTime, formatDate } from '@/lib/format';
import type { AdminUser, AuditLog, NotificationItem, SiteSettings } from '@/types';
import { Shield, Users, Bell, Sliders, Plus, History, Search, ChevronRight, ChevronDown, CheckCircle2, UserCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const { user } = useAuth();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Audit Log Filter States
  const [auditEntity, setAuditEntity] = useState('ALL');
  const [auditAction, setAuditAction] = useState('ALL');
  const [auditAdmin, setAuditAdmin] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Admin Users Query
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      const data = res.data.data || res.data;
      return Array.isArray(data) ? data : data.users || [];
    },
    enabled: activeTab === 'users' || activeTab === 'audit',
  });

  // Audit Logs Query
  const { data: logs = [], isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', auditEntity, auditAction, auditAdmin, auditSearch],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs', {
        params: {
          entityType: auditEntity !== 'ALL' ? auditEntity : undefined,
          action: auditAction !== 'ALL' ? auditAction : undefined,
          adminUserId: auditAdmin !== 'ALL' ? auditAdmin : undefined,
          search: auditSearch.trim() !== '' ? auditSearch.trim() : undefined,
          limit: 100,
        },
      });
      const data = res.data.data || res.data;
      return Array.isArray(data) ? data : data.logs || [];
    },
    enabled: activeTab === 'audit',
  });

  // Notifications Query
  const { data: notifications = [], isLoading: notifLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      const data = res.data.data || res.data;
      return Array.isArray(data) ? data : data.notifications || [];
    },
    enabled: activeTab === 'notifications',
  });

  // Site Settings Query
  const { data: siteSettings, isLoading: settingsLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'site',
  });

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setUserError(null);
    try {
      await apiClient.post('/admin/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      refetchUsers();
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (err: any) {
      setUserError(err.response?.data?.message || err.response?.data?.error || 'Failed to create admin user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const userColumns: Column<AdminUser>[] = [
    {
      header: 'Admin User',
      accessor: (row) => {
        const isCurrent = user?.id === row.id;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-xs text-graphite-900">{row.name}</p>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CURRENT USER
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-graphite-500">{row.email}</p>
          </div>
        );
      },
    },
    {
      header: 'Role',
      accessor: (row) => <StatusBadge status={row.role} />,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {row.isActive ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      header: 'Last Login',
      accessor: (row) => (
        <span className="text-xs text-graphite-500">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never logged in'}
        </span>
      ),
    },
    {
      header: 'Created Date',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    {
      header: 'Date & Time',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700 whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Admin User',
      accessor: (row) => (
        <div>
          <p className="font-bold text-xs text-graphite-900">{row.admin?.name || 'System'}</p>
          <p className="text-[11px] font-mono text-graphite-500">{row.admin?.email || 'automated'}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (row) => {
        let badgeColor = 'bg-graphite-100 text-graphite-700 border-graphite-300';
        if (row.action === 'CREATE') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
        if (row.action === 'UPDATE') badgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
        if (row.action === 'DELETE') badgeColor = 'bg-red-50 text-red-800 border-red-300';
        if (row.action === 'PUBLISH') badgeColor = 'bg-purple-50 text-purple-800 border-purple-300';
        if (row.action === 'UNPUBLISH') badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
        if (row.action === 'LOGIN') badgeColor = 'bg-cyan-50 text-cyan-800 border-cyan-300';

        return (
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${badgeColor}`}>
            {row.action}
          </span>
        );
      },
    },
    {
      header: 'Entity',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-800">
          {row.entityType || '—'}
        </span>
      ),
    },
    {
      header: 'Entity ID',
      accessor: (row) => (
        <span className="text-[11px] font-mono bg-graphite-100 px-2 py-0.5 rounded text-graphite-600 truncate max-w-[140px] block">
          {row.entityId || '—'}
        </span>
      ),
    },
    {
      header: 'Details',
      accessor: (row) => {
        const hasDetails = row.before || row.after;
        const isExpanded = expandedLogId === row.id;

        return (
          <div className="space-y-1">
            <p className="text-xs text-graphite-700">{row.note || '—'}</p>
            {hasDetails && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedLogId(isExpanded ? null : row.id);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {isExpanded ? 'Hide Details' : 'View Changes'}
              </button>
            )}
            {isExpanded && hasDetails && (
              <div className="mt-2 space-y-1.5 rounded-lg border border-graphite-200 bg-graphite-900 p-2.5 text-[11px] text-white font-mono overflow-x-auto max-w-md shadow-inner">
                {row.before && (
                  <div>
                    <span className="text-red-400 font-bold">BEFORE:</span>
                    <pre className="text-graphite-300 whitespace-pre-wrap">{JSON.stringify(row.before, null, 2)}</pre>
                  </div>
                )}
                {row.after && (
                  <div className="pt-1.5 border-t border-graphite-700">
                    <span className="text-emerald-400 font-bold">AFTER:</span>
                    <pre className="text-graphite-300 whitespace-pre-wrap">{JSON.stringify(row.after, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Administration"
        description="Manage administrative team accounts, security audit logs, platform notifications, and storefront settings."
      />

      <Tabs
        tabs={[
          { id: 'users', label: 'Admin Users' },
          { id: 'audit', label: 'Audit Log' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'site', label: 'Brand & Site Settings' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-graphite-200 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-graphite-900">Administrative Users</h3>
              <p className="text-[11px] text-graphite-500">
                Only Super Admin accounts can invite or manage administrative team members.
              </p>
            </div>
            {user?.role === 'SUPER_ADMIN' && (
              <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Admin User
              </Button>
            )}
          </div>

          <Table
            columns={userColumns}
            data={users}
            keyExtractor={(row) => row.id}
            isLoading={usersLoading}
            emptyMessage="No administrative users found."
          />

          {/* Add Admin User Modal */}
          <Modal
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            title="Add Administrative User"
            description="Create a new admin user account. Password will be securely hashed."
            maxWidth="md"
          >
            <form onSubmit={handleCreateUser} className="space-y-4">
              {userError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {userError}
                </div>
              )}

              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="john@houseofseya.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />

              <Input
                label="Initial Password"
                type="password"
                placeholder="••••••••"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />

              <Select
                label="Administrative Role"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                options={[
                  { value: 'SUPER_ADMIN', label: 'Super Admin (Full system control + user management)' },
                  { value: 'ADMIN', label: 'Admin (Full product, content, order management)' },
                  { value: 'MANAGER', label: 'Manager (Orders, inventory, customer management)' },
                  { value: 'STAFF', label: 'Staff (Read & update orders only)' },
                ]}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-graphite-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddUserOpen(false)}
                  disabled={isCreatingUser}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isCreatingUser}>
                  Create Admin User
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-graphite-200 shadow-2xs">
            <div>
              <label className="block text-[11px] font-bold text-graphite-700 mb-1">Search Logs</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-graphite-400" />
                <input
                  type="text"
                  placeholder="Search notes, IDs, emails..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full rounded-lg border border-graphite-300 pl-8 pr-2.5 py-1.5 text-xs text-graphite-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-graphite-700 mb-1">Filter Entity</label>
              <select
                value={auditEntity}
                onChange={(e) => setAuditEntity(e.target.value)}
                className="w-full rounded-lg border border-graphite-300 px-2.5 py-1.5 text-xs text-graphite-900 focus:border-brand-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Entities</option>
                <option value="Product">Product</option>
                <option value="ProductVariant">Product Variant</option>
                <option value="ProductCategory">Category</option>
                <option value="Subcategory">Subcategory</option>
                <option value="AdminUser">Admin User</option>
                <option value="Page">Page (CMS)</option>
                <option value="SiteSettings">Site Settings</option>
                <option value="BlogPost">Blog Post</option>
                <option value="FAQ">FAQ</option>
                <option value="Review">Review</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-graphite-700 mb-1">Filter Action</label>
              <select
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                className="w-full rounded-lg border border-graphite-300 px-2.5 py-1.5 text-xs text-graphite-900 focus:border-brand-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="PUBLISH">PUBLISH</option>
                <option value="UNPUBLISH">UNPUBLISH</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-graphite-700 mb-1">Filter Admin User</label>
              <select
                value={auditAdmin}
                onChange={(e) => setAuditAdmin(e.target.value)}
                className="w-full rounded-lg border border-graphite-300 px-2.5 py-1.5 text-xs text-graphite-900 focus:border-brand-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Admins</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <Table
            columns={auditColumns}
            data={logs}
            keyExtractor={(row) => row.id}
            isLoading={auditLoading}
            emptyMessage="No matching audit logs found in PostgreSQL."
          />
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifLoading ? (
            <p className="py-8 text-center text-xs text-graphite-400">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-graphite-200 bg-white p-12 text-center text-xs text-graphite-500">
              <Bell className="mx-auto h-8 w-8 text-graphite-300 mb-2" />
              No unread platform notifications.
            </div>
          ) : (
            <div className="rounded-xl border border-graphite-200 bg-white divide-y divide-graphite-100">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 flex items-start justify-between text-xs">
                  <div>
                    <p className="font-bold text-graphite-900">{n.title}</p>
                    <p className="text-graphite-600 mt-0.5">{n.body}</p>
                  </div>
                  <span className="text-[11px] text-graphite-400">{formatDateTime(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Brand & Site Settings */}
      {activeTab === 'site' && (
        <SiteSettingsForm siteSettings={siteSettings} />
      )}
    </div>
  );
};

const SiteSettingsForm: React.FC<{ siteSettings?: SiteSettings }> = ({ siteSettings }) => {
  const [whatsappNumber, setWhatsappNumber] = useState(siteSettings?.whatsappNumber || '+91 98765 43210');
  const [contactEmail, setContactEmail] = useState(siteSettings?.contactEmail || 'care@houseofseya.com');
  const [contactPhone, setContactPhone] = useState(siteSettings?.contactPhone || '+91 98765 43210');
  const [instagramUrl, setInstagramUrl] = useState(siteSettings?.instagramUrl || 'https://instagram.com/houseofseya');
  const [facebookUrl, setFacebookUrl] = useState(siteSettings?.facebookUrl || 'https://facebook.com/houseofseya');
  const [footerTagline, setFooterTagline] = useState(siteSettings?.footerTagline || 'Fine Jewellery in Lab-Grown Diamonds & 24K Gold Vermeil.');
  const [footerCopyright, setFooterCopyright] = useState(siteSettings?.footerCopyright || '© 2026 House of Seya. All Rights Reserved.');
  const [announcements, setAnnouncements] = useState((siteSettings?.announcementMessages || []).join('\n'));
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (siteSettings) {
      setWhatsappNumber(siteSettings.whatsappNumber || '');
      setContactEmail(siteSettings.contactEmail || '');
      setContactPhone(siteSettings.contactPhone || '');
      setInstagramUrl(siteSettings.instagramUrl || '');
      setFacebookUrl(siteSettings.facebookUrl || '');
      setFooterTagline(siteSettings.footerTagline || '');
      setFooterCopyright(siteSettings.footerCopyright || '');
      setAnnouncements((siteSettings.announcementMessages || []).join('\n'));
    }
  }, [siteSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);
    try {
      await apiClient.put('/settings', {
        whatsappNumber,
        contactEmail,
        contactPhone,
        instagramUrl,
        facebookUrl,
        footerTagline,
        footerCopyright,
        announcementMessages: announcements.split('\n').filter((line) => line.trim() !== ''),
      });
      setMsg({ type: 'success', text: 'Brand & Site Settings saved successfully to PostgreSQL!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="rounded-xl border border-graphite-200 bg-white p-6 space-y-4 max-w-2xl shadow-2xs">
      <h3 className="text-xs font-bold text-graphite-900">Brand Contact & Storefront Settings</h3>

      {msg && (
        <div
          className={`rounded-lg p-3 text-xs border ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="WhatsApp Business Number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required />
        <Input label="Contact Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Contact Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        <Input label="Instagram Page URL" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
      </div>

      <Input label="Facebook Page URL" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
      <Input label="Footer Tagline" value={footerTagline} onChange={(e) => setFooterTagline(e.target.value)} />
      <Input label="Footer Copyright Notice" value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} />

      <div>
        <label className="block text-xs font-semibold text-graphite-700 mb-1">Storefront Announcement Messages (1 per line)</label>
        <textarea
          rows={3}
          value={announcements}
          onChange={(e) => setAnnouncements(e.target.value)}
          placeholder="Complimentary Shipping Across India&#10;Complimentary 100-Day Insured Warranty"
          className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs text-graphite-900"
        />
      </div>

      <div className="flex justify-end pt-3 border-t border-graphite-200">
        <Button type="submit" size="sm" isLoading={isSaving}>
          Save Brand Settings
        </Button>
      </div>
    </form>
  );
};
