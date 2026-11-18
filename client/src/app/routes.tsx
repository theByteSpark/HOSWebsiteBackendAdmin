import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { useAuth } from '@/features/auth/useAuth';
import { ProductsPage } from '@/features/products/ProductsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { ImagesPage } from '@/features/media/ImagesPage';
import { SubcategoriesPage } from '@/features/categories/SubcategoriesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { BlogsPage } from '@/features/blogs/BlogsPage';
import { BlogEditorPage } from '@/features/blogs/BlogEditorPage';
import type { AdminRole } from '@/types';

// Everything except the SEO manager: commerce screens, media library and settings.
const COMMERCE_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];
const BLOG_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'SEO_MANAGER'];

const commerce = (el: React.ReactElement) => (
  <ProtectedRoute allowedRoles={COMMERCE_ROLES}>{el}</ProtectedRoute>
);
const blogs = (el: React.ReactElement) => (
  <ProtectedRoute allowedRoles={BLOG_ROLES}>{el}</ProtectedRoute>
);

// SEO managers land on Blogs; everyone else on Products.
const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={user?.role === 'SEO_MANAGER' ? '/blogs' : '/products'} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/products" element={commerce(<ProductsPage />)} />
        <Route path="/categories" element={commerce(<CategoriesPage />)} />
        <Route path="/subcategories" element={commerce(<SubcategoriesPage />)} />
        <Route path="/images" element={commerce(<ImagesPage />)} />
        <Route path="/settings" element={commerce(<SettingsPage />)} />
        <Route path="/admin-users" element={<Navigate to="/settings?tab=users" replace />} />

        <Route path="/blogs" element={blogs(<BlogsPage />)} />
        <Route path="/blogs/new" element={blogs(<BlogEditorPage />)} />
        <Route path="/blogs/:id" element={blogs(<BlogEditorPage />)} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};
