import { Router } from 'express';
import { getInventoryItems, adjustStock, updateInventoryItem } from './inventory.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireManager, requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateAdmin);

router.get('/', requireStaff, getInventoryItems);
router.post('/adjust', requireManager, adjustStock);
router.patch('/:id', requireManager, updateInventoryItem);

export default router;
