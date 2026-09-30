import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { WebsitePage } from '@/features/website/WebsitePage';
import { SettingsPage } from '@/features/settings/SettingsPage';

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
        {/* Products is the primary landing page — Dashboard/Orders/Customers/Inventory/Reports removed */}
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/website" element={<WebsitePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/audit-logs" element={<Navigate to="/settings?tab=audit" replace />} />
        <Route path="/admin-users" element={<Navigate to="/settings?tab=users" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/products" replace />} />
    </Routes>
  );
};
