import { Router } from 'express';
import {
  listBlogsAdmin,
  getBlogAdmin,
  createBlog,
  updateBlog,
  setBlogStatus,
  deleteBlog,
  forceBlogUpload,
  uploadBlogImage,
  listBlogsPublic,
  getBlogPublic,
  blogSitemap,
} from './blogs.controller';
import { uploadMiddleware } from '../media/media.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireBlogEditor } from '../../middleware/rbac.middleware';

const router = Router();

// ── Public (storefront) ──────────────────────────────────────
router.get('/', listBlogsPublic);
router.get('/sitemap.xml', blogSitemap);

// ── Admin (SEO_MANAGER, ADMIN, SUPER_ADMIN) ──────────────────
// Declared before '/:slug' so "admin" is never treated as a slug.
router.get('/admin/list', authenticateAdmin, requireBlogEditor, listBlogsAdmin);
router.get('/admin/:id', authenticateAdmin, requireBlogEditor, getBlogAdmin);
router.post('/admin/upload-image', authenticateAdmin, requireBlogEditor, uploadMiddleware, forceBlogUpload, uploadBlogImage);
router.post('/', authenticateAdmin, requireBlogEditor, createBlog);
router.put('/:id', authenticateAdmin, requireBlogEditor, updateBlog);
router.patch('/:id/status', authenticateAdmin, requireBlogEditor, setBlogStatus);
router.delete('/:id', authenticateAdmin, requireBlogEditor, deleteBlog);

// ── Public single post (keep last) ───────────────────────────
router.get('/:slug', getBlogPublic);

export default router;
