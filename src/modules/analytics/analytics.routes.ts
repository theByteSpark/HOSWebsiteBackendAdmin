import { Router } from 'express';
import { getDashboardAnalytics } from './analytics.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireManager } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/dashboard', authenticateAdmin, requireManager, getDashboardAnalytics);

export default router;
