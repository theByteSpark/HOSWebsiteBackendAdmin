import { Router } from 'express';
import { getLatestPosts } from './instagram.controller';

const router = Router();

// Public read route used by the storefront's Instagram section
router.get('/', getLatestPosts);

export default router;
