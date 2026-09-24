import { Router } from 'express';
import {
  getAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from './adminUsers.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateAdmin, requireSuperAdmin);

router.get('/', getAdminUsers);
router.get('/:id', getAdminUserById);
router.post('/', createAdminUser);
router.put('/:id', updateAdminUser);
router.delete('/:id', deleteAdminUser);

export default router;
