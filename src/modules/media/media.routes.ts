import { Router } from 'express';
import {
  getMediaAssets,
  uploadMedia,
  uploadMiddleware,
  deleteMediaAsset,
} from './media.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticateAdmin, getMediaAssets);
router.post('/upload', authenticateAdmin, requireAdmin, uploadMiddleware, uploadMedia);
router.delete('/:id', authenticateAdmin, requireAdmin, deleteMediaAsset);

export default router;
