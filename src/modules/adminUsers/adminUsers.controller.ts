import { Response } from 'express';
import { prisma } from '../../config/db';
import { hashPassword } from '../../utils/hash';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AdminRole } from '@prisma/client';

export const getAdminUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, users);
  } catch (error) {
    return sendError(res, 'Failed to fetch admin users', 500, error);
  }
};

export const getAdminUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return sendError(res, 'Admin user not found', 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, 'Failed to fetch admin user', 500, error);
  }
};

export const createAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password || !role) {
      return sendError(res, 'Name, email, password, and role are required', 400);
    }

    const existing = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return sendError(res, 'Admin user with this email already exists', 400);
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.adminUser.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as AdminRole,
        permissions: permissions || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        adminUserId: req.user?.id,
        entityType: 'AdminUser',
        entityId: newUser.id,
        after: newUser as any,
        note: `Created admin user ${newUser.email}`,
      },
    });

    return sendSuccess(res, newUser, 'Admin user created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create admin user', 500, error);
  }
};

export const updateAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, role, isActive, permissions, password } = req.body;

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Admin user not found', 404);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role as AdminRole;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        adminUserId: req.user?.id,
        entityType: 'AdminUser',
        entityId: updatedUser.id,
        before: existing as any,
        after: updatedUser as any,
        note: `Updated admin user ${updatedUser.email}`,
      },
    });

    return sendSuccess(res, updatedUser, 'Admin user updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update admin user', 500, error);
  }
};

export const deleteAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (id === req.user?.id) {
      return sendError(res, 'You cannot delete your own admin account', 400);
    }

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Admin user not found', 404);
    }

    await prisma.adminUser.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        adminUserId: req.user?.id,
        entityType: 'AdminUser',
        entityId: id,
        before: existing as any,
        note: `Deleted admin user ${existing.email}`,
      },
    });

    return sendSuccess(res, null, 'Admin user deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete admin user', 500, error);
  }
};
