import { Router } from 'express';
import { getAuditLogs } from './auditLogs.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticateAdmin, requireAdmin, getAuditLogs);

export default router;
