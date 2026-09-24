import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from './notifications.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
