import { Router } from 'express';
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct,
  publishProduct,
} from './products.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Public / Frontend Read Routes
router.get('/', getProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

// Admin Product Routes
router.post('/', authenticateAdmin, requireAdmin, createProduct);
router.put('/:id', authenticateAdmin, requireAdmin, updateProduct);
router.patch('/:id/publish', authenticateAdmin, requireAdmin, publishProduct);
router.delete('/:id', authenticateAdmin, requireAdmin, deleteProduct);

export default router;
