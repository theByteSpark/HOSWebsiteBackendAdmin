import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response';
import { AdminRole } from '@prisma/client';

export const requireRole = (allowedRoles: AdminRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated', 401);
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return sendError(
      res,
      `Forbidden: Your role (${req.user.role}) does not have access to this action.`,
      403
    );
  };
};

export const requireSuperAdmin = requireRole([AdminRole.SUPER_ADMIN]);
export const requireAdmin = requireRole([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]);
export const requireManager = requireRole([
  AdminRole.SUPER_ADMIN,
  AdminRole.ADMIN,
  AdminRole.MANAGER,
]);
export const requireStaff = requireRole([
  AdminRole.SUPER_ADMIN,
  AdminRole.ADMIN,
  AdminRole.MANAGER,
  AdminRole.STAFF,
]);
