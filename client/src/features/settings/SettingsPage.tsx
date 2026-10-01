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
import type { AdminUser, NotificationItem } from '@/types';
import { Shield, Users, Bell, Sliders, Plus, History, Search, ChevronRight, ChevronDown, CheckCircle2, UserCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const { user } = useAuth();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Admin Users Query
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      const data = res.data.data || res.data;
      return Array.isArray(data) ? data : data.users || [];
    },
    enabled: activeTab === 'users',
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Administration"
        description="Manage administrative team accounts and platform notifications."
      />

      <Tabs
        tabs={[
          { id: 'users', label: 'Admin Users' },
          { id: 'notifications', label: 'Notifications' },
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

    </div>
  );
};
