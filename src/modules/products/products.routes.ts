import { Router } from 'express';
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct,
  publishProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  addVariantImage,
  deleteVariantImage,
  reorderVariantImages,
} from './products.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// ── Public / Storefront Read Routes ──────────────────────────
router.get('/', getProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

// ── Admin Product Routes ──────────────────────────────────────
router.post('/', authenticateAdmin, requireAdmin, createProduct);
router.put('/:id', authenticateAdmin, requireAdmin, updateProduct);
router.patch('/:id', authenticateAdmin, requireAdmin, updateProduct);
router.patch('/:id/publish', authenticateAdmin, requireAdmin, publishProduct);
router.delete('/:id', authenticateAdmin, requireAdmin, deleteProduct);

// ── Variant Routes (scoped under product) ────────────────────
router.post('/:id/variants', authenticateAdmin, requireAdmin, createVariant);
router.patch('/variants/:variantId', authenticateAdmin, requireAdmin, updateVariant);
router.delete('/variants/:variantId', authenticateAdmin, requireAdmin, deleteVariant);

// ── Variant Image Routes ──────────────────────────────────────
router.post('/variants/:variantId/images', authenticateAdmin, requireAdmin, addVariantImage);
router.delete('/variant-images/:imageId', authenticateAdmin, requireAdmin, deleteVariantImage);
router.patch('/variants/:variantId/images/reorder', authenticateAdmin, requireAdmin, reorderVariantImages);

export default router;
