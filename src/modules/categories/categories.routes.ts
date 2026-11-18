import { Router } from 'express';
import {
  getCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from './categories.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Public / Frontend Read Routes
router.get('/', getCategories);
router.get('/:idOrSlug', getCategoryByIdOrSlug);

// Admin Category Routes
router.post('/', authenticateAdmin, requireAdmin, createCategory);
router.put('/:id', authenticateAdmin, requireAdmin, updateCategory);
router.delete('/:id', authenticateAdmin, requireAdmin, deleteCategory);

// Admin Subcategory Routes
router.post('/subcategories', authenticateAdmin, requireAdmin, createSubcategory);
router.put('/subcategories/:id', authenticateAdmin, requireAdmin, updateSubcategory);
router.delete('/subcategories/:id', authenticateAdmin, requireAdmin, deleteSubcategory);

export default router;
