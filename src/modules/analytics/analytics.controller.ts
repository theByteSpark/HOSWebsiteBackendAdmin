import { Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getDashboardAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const validSalesStatuses = ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'];

    const [
      orders30d,
      ordersPrev30d,
      ordersMtd,
      ordersYtd,
      orderCountToday,
      inventoryItems,
      ordersByStatus,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
          status: { in: validSalesStatuses as any },
        },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          status: { in: validSalesStatuses as any },
        },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth },
          status: { in: validSalesStatuses as any },
        },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfYear },
          status: { in: validSalesStatuses as any },
        },
        select: { total: true },
      }),
      prisma.order.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.inventoryItem.findMany({ select: { quantity: true, reorderLevel: true } }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    const revenue30d = orders30d.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const revenuePrev30d = ordersPrev30d.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const revenueMtd = ordersMtd.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const revenueYtd = ordersYtd.reduce((sum: number, o: any) => sum + Number(o.total), 0);

    const revenueChange30d = revenuePrev30d > 0
      ? Math.round(((revenue30d - revenuePrev30d) / revenuePrev30d) * 100)
      : 0;

    const lowStockCount = inventoryItems.filter((i: any) => i.quantity <= i.reorderLevel).length;

    const statusCountsMap: Record<string, number> = {};
    ordersByStatus.forEach((s: any) => {
      statusCountsMap[s.status] = s._count.id;
    });

    return sendSuccess(res, {
      revenueToday: 0,
      revenue7d: 0,
      revenue30d,
      revenueMtd,
      revenueYtd,
      revenueChange30d,
      orderCountToday,
      orderCount30d: orders30d.length,
      pendingOrdersCount: statusCountsMap['PENDING'] || 0,
      lowStockCount,
      ordersByStatus: statusCountsMap,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch dashboard analytics', 500, error);
  }
};
