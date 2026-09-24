import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { formatDateTime, formatDate } from '@/lib/format';
import type { AdminUser, AuditLog, NotificationItem, SiteSettings } from '@/types';
import { Shield, Users, Bell, Sliders, Plus, History } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Admin Users Query
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'users',
  });

  // Audit Logs Query
  const { data: auditData, isLoading: auditLoading } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'audit',
  });

  // Notifications Query
  const { data: notificationsData, isLoading: notifLoading } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data.data || res.data;
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
  const [newUserRole, setNewUserRole] = useState('STAFF');
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
      setUserError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const userColumns: Column<AdminUser>[] = [
    {
      header: 'Admin Name',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.name}</p>
          <p className="text-xs text-graphite-400">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (row) => <StatusBadge status={row.role} />,
    },
    {
      header: 'Account Status',
      accessor: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Last Login',
      accessor: (row) => (
        <span className="text-xs text-graphite-500">{formatDateTime(row.lastLoginAt)}</span>
      ),
    },
    {
      header: 'Created Date',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    {
      header: 'Action',
      accessor: (row) => <StatusBadge status={row.action} />,
    },
    {
      header: 'Admin / Actor',
      accessor: (row) => (
        <span className="font-semibold text-graphite-800">{row.admin?.name || 'System / Admin'}</span>
      ),
    },
    {
      header: 'Target Entity',
      accessor: (row) => (
        <span className="text-xs font-mono text-graphite-600">
          {row.entityType ? `${row.entityType} (${row.entityId || 'all'})` : '—'}
        </span>
      ),
    },
    {
      header: 'Note',
      accessor: (row) => <span className="text-xs text-graphite-500">{row.note || '—'}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Administration"
        description="Manage admin team members, role permissions, activity audit logs, and brand configuration."
      />

      <Tabs
        tabs={[
          { id: 'users', label: 'Admin Users & Roles' },
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
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Admin User
            </Button>
          </div>

          <Table
            columns={userColumns}
            data={usersData?.users || []}
            keyExtractor={(row) => row.id}
            isLoading={usersLoading}
            emptyMessage="No administrative users found."
          />

          {/* Add Admin User Modal */}
          <Modal
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            title="Add Administrative User"
            description="Create an admin user account with specific role-based access."
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
                label="Temporary Password"
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
                  { value: 'SUPER_ADMIN', label: 'Super Admin (Full platform access)' },
                  { value: 'ADMIN', label: 'Admin (Orders, products, CMS, reports)' },
                  { value: 'MANAGER', label: 'Manager (Orders, inventory, customers)' },
                  { value: 'STAFF', label: 'Staff (Orders processing & updates)' },
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
          <Table
            columns={auditColumns}
            data={auditData?.logs || []}
            keyExtractor={(row) => row.id}
            isLoading={auditLoading}
            emptyMessage="No audit logs recorded yet."
          />
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifLoading ? (
            <p className="py-8 text-center text-xs text-graphite-400">Loading notifications...</p>
          ) : !notificationsData?.notifications || notificationsData.notifications.length === 0 ? (
            <div className="rounded-xl border border-graphite-200 bg-white p-12 text-center text-xs text-graphite-500">
              <Bell className="mx-auto h-8 w-8 text-graphite-300 mb-2" />
              No unread platform notifications.
            </div>
          ) : (
            <div className="rounded-xl border border-graphite-200 bg-white divide-y divide-graphite-100">
              {notificationsData.notifications.map((n) => (
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
    <form onSubmit={handleSave} className="rounded-xl border border-graphite-200 bg-white p-6 space-y-4 max-w-2xl">
      <h3 className="text-sm font-bold text-graphite-900">Brand Contact & Storefront Settings</h3>

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
