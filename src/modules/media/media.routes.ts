import { Router } from 'express';
import {
  getMediaAssets,
  uploadMedia,
  uploadMiddleware,
  deleteMediaAsset,
  bulkDeleteMedia,
} from './media.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticateAdmin, requireStaff, getMediaAssets);
router.post('/upload', authenticateAdmin, requireAdmin, uploadMiddleware, uploadMedia);
router.post('/bulk-delete', authenticateAdmin, requireAdmin, bulkDeleteMedia);
router.delete('/:id', authenticateAdmin, requireAdmin, deleteMediaAsset);

export default router;
