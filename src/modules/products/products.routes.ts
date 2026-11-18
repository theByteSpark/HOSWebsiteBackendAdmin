import { Router } from 'express';
import {
  getProducts,
  getProductById,
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
import multer from 'multer';
import { downloadProductTemplate, bulkCreateProducts } from './productBulk.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  },
});

// ── Public / Storefront Read Routes ──────────────────────────
router.get('/', getProducts);
router.get('/bulk/template', authenticateAdmin, requireAdmin, downloadProductTemplate);
router.get('/:id', getProductById);

// ── Admin Product Routes ──────────────────────────────────────
router.post('/', authenticateAdmin, requireAdmin, createProduct);
router.post('/bulk', authenticateAdmin, requireAdmin, excelUpload.single('file'), bulkCreateProducts);
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
