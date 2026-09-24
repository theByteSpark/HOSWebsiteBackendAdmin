import { Router } from 'express';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  getBlogPosts,
  getBlogPostByIdOrSlug,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getPages,
  getPageBySlug,
  updatePage,
  getNavigationItems,
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  getFAQCategories,
  createFAQCategory,
  deleteFAQCategory,
} from './cms.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Hero Slides
router.get('/hero-slides', getHeroSlides);
router.post('/hero-slides', authenticateAdmin, requireAdmin, createHeroSlide);
router.put('/hero-slides/:id', authenticateAdmin, requireAdmin, updateHeroSlide);
router.delete('/hero-slides/:id', authenticateAdmin, requireAdmin, deleteHeroSlide);

// Reviews
router.get('/reviews', getReviews);
router.post('/reviews', authenticateAdmin, requireAdmin, createReview);
router.put('/reviews/:id', authenticateAdmin, requireAdmin, updateReview);
router.delete('/reviews/:id', authenticateAdmin, requireAdmin, deleteReview);

// Blogs
router.get('/blogs', getBlogPosts);
router.get('/blog-posts', getBlogPosts);
router.get('/blogs/:idOrSlug', getBlogPostByIdOrSlug);
router.get('/blog-posts/:idOrSlug', getBlogPostByIdOrSlug);
router.post('/blogs', authenticateAdmin, requireAdmin, createBlogPost);
router.post('/blog-posts', authenticateAdmin, requireAdmin, createBlogPost);
router.put('/blogs/:id', authenticateAdmin, requireAdmin, updateBlogPost);
router.put('/blog-posts/:id', authenticateAdmin, requireAdmin, updateBlogPost);
router.delete('/blogs/:id', authenticateAdmin, requireAdmin, deleteBlogPost);
router.delete('/blog-posts/:id', authenticateAdmin, requireAdmin, deleteBlogPost);

// FAQs
router.get('/faqs', getFAQs);
router.post('/faqs', authenticateAdmin, requireAdmin, createFAQ);
router.put('/faqs/:id', authenticateAdmin, requireAdmin, updateFAQ);
router.delete('/faqs/:id', authenticateAdmin, requireAdmin, deleteFAQ);

// FAQ Categories
router.get('/faq-categories', getFAQCategories);
router.post('/faq-categories', authenticateAdmin, requireAdmin, createFAQCategory);
router.delete('/faq-categories/:id', authenticateAdmin, requireAdmin, deleteFAQCategory);

// Pages
router.get('/pages', getPages);
router.get('/pages/:slug', getPageBySlug);
router.put('/pages/:slug', authenticateAdmin, requireAdmin, updatePage);

// Navigation
router.get('/navigation', getNavigationItems);
router.post('/navigation', authenticateAdmin, requireAdmin, createNavigationItem);
router.put('/navigation/:id', authenticateAdmin, requireAdmin, updateNavigationItem);
router.delete('/navigation/:id', authenticateAdmin, requireAdmin, deleteNavigationItem);

export default router;
