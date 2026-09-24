import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import adminUsersRoutes from './modules/adminUsers/adminUsers.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import customersRoutes from './modules/customers/customers.routes';
import ordersRoutes from './modules/orders/orders.routes';
import cmsRoutes from './modules/cms/cms.routes';
import siteSettingsRoutes from './modules/siteSettings/siteSettings.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import auditLogsRoutes from './modules/auditLogs/auditLogs.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import mediaRoutes from './modules/media/media.routes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'House of Seya Backend API', timestamp: new Date().toISOString() });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin/users', adminUsersRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/customers', customersRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/cms', cmsRoutes);
apiRouter.use('/settings', siteSettingsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/audit-logs', auditLogsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/media', mediaRoutes);

export default apiRouter;
