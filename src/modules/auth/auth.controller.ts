import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { comparePassword } from '../../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin || !admin.isActive) {
      return sendError(res, 'Invalid credentials or account deactivated', 401);
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          adminUserId: admin.id,
          note: `Failed login attempt for ${email}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
      return sendError(res, 'Invalid credentials', 401);
    }

    const tokenPayload = { id: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token and update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        refreshToken,
        lastLoginAt: new Date(),
      },
    });

    // Audit log success
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        adminUserId: admin.id,
        note: `Successful login for ${email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return sendSuccess(res, {
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    return sendError(res, 'Login failed', 500, error);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);
    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
    });

    if (!admin || !admin.isActive || admin.refreshToken !== refreshToken) {
      return sendError(res, 'Invalid refresh token', 401);
    }

    const tokenPayload = { id: admin.id, email: admin.email, role: admin.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { refreshToken: newRefreshToken },
    });

    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed successfully');
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token', 401, error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.id) {
      await prisma.adminUser.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });

      await prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          adminUserId: req.user.id,
          note: `User logged out`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
    }

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    return sendError(res, 'Logout failed', 500, error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return sendError(res, 'Unauthenticated', 401);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return sendError(res, 'User not found', 44);
    }

    return sendSuccess(res, admin);
  } catch (error) {
    return sendError(res, 'Failed to fetch current user profile', 500, error);
  }
};
