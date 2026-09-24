import { Router } from 'express';
import { login, refresh, logout, getMe } from './auth.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticateAdmin, logout);
router.get('/me', authenticateAdmin, getMe);

export default router;
