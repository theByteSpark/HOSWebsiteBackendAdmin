import { Router } from 'express';
import { getSiteSettings, updateSiteSettings } from './siteSettings.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', getSiteSettings);
router.put('/', authenticateAdmin, requireAdmin, updateSiteSettings);

export default router;
