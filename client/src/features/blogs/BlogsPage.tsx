import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { thumbnailFor } from '@/lib/imageUrl';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { BlogSummary } from '@/types';

interface BlogListResponse {
  blogs: BlogSummary[];
  total: number;
  page: number;
  totalPages: number;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const BlogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<BlogSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<BlogListResponse>({
    queryKey: ['blogs-admin', search, status, page],
    queryFn: async () => {
      const res = await apiClient.get('/blogs/admin/list', {
        params: { search: search || undefined, status: status || undefined, page, limit: 15 },
      });
      return res.data.data || res.data;
    },
  });

  const blogs = data?.blogs || [];

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/blogs/${deleting.id}`);
      setDeleting(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete blog.');
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<BlogSummary>[] = [
    {
      header: 'Blog',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-graphite-200 bg-graphite-100">
            {row.coverImage ? (
              <img src={thumbnailFor(row.coverImage) || row.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-4 w-4 text-graphite-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-graphite-900">{row.title}</p>
            <p className="truncate font-mono text-xs text-graphite-400">/blogs/{row.slug}</p>
          </div>
        </div>
      ),
    },
    { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
    { header: 'Author', accessor: (row) => <span className="text-xs text-graphite-700">{row.authorName || '—'}</span> },
    { header: 'Published', accessor: (row) => <span className="text-xs text-graphite-600">{fmt(row.publishedAt)}</span> },
    { header: 'Updated', accessor: (row) => <span className="text-xs text-graphite-600">{fmt(row.updatedAt)}</span> },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/blogs/${row.id}`);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blogs"
        description="SEO articles shown on the storefront Journal."
        action={
          <Button size="sm" onClick={() => navigate('/blogs/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Blog
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          className="sm:w-80"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by title or slug…"
        />
        <Select
          className="sm:w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Draft' },
          ]}
        />
      </div>

      {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{errorMsg}</div>}

      <Table
        columns={columns}
        data={blogs}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/blogs/${row.id}`)}
        isLoading={isLoading}
        emptyMessage="No blogs yet. Click “New Blog” to write your first article."
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-graphite-600">
          <span>
            Page {data.page} of {data.totalPages} · {data.total} blogs
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete blog?"
        message={`“${deleting?.title}” will be permanently removed from the website. This cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
