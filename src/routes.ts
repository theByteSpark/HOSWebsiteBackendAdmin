import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import adminUsersRoutes from './modules/adminUsers/adminUsers.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import mediaRoutes from './modules/media/media.routes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'House of Seya Backend API', timestamp: new Date().toISOString() });
});

// Auth + Admin User Management
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin/users', adminUsersRoutes);

// Product Catalog
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/products', productsRoutes);

// Notifications, Media
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/media', mediaRoutes);

export default apiRouter;
