import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuditAction } from '@prisma/client';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '50';
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as AuditAction | undefined;
    const adminUserId = req.query.adminUserId as string | undefined;
    const search = req.query.search as string | undefined;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (entityType && entityType !== 'ALL') where.entityType = entityType;
    if (action && (action as string) !== 'ALL') where.action = action;
    if (adminUserId && adminUserId !== 'ALL') where.adminUserId = adminUserId;

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { note: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { admin: { email: { contains: q, mode: 'insensitive' } } },
        { admin: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          admin: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return sendSuccess(res, logs, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch audit logs', 500, error);
  }
};
