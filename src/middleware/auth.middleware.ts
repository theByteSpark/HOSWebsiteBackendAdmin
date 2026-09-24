import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { permissions?: any };
}

export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify admin user still exists and is active
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true, permissions: true },
    });

    if (!adminUser || !adminUser.isActive) {
      return sendError(res, 'User account deactivated or not found', 401);
    }

    req.user = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions,
    };

    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 401, error);
  }
};
