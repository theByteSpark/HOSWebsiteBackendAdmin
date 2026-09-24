import { Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id;
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { adminUserId },
          { adminUserId: null }, // broadcast
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return sendSuccess(res, { notifications, unreadCount });
  } catch (error) {
    return sendError(res, 'Failed to fetch notifications', 500, error);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return sendError(res, 'Failed to mark notification as read', 500, error);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id;
    await prisma.notification.updateMany({
      where: {
        OR: [{ adminUserId }, { adminUserId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, 'Failed to mark all notifications as read', 500, error);
  }
};
