import { prisma } from '../config/db';
import { AuditAction } from '@prisma/client';

export interface AuditLogOptions {
  adminUserId?: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  before?: any;
  after?: any;
  note?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function sanitizeAuditObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeAuditObject);

  const clean: Record<string, any> = { ...obj };
  delete clean.password;
  delete clean.passwordHash;
  delete clean.refreshToken;
  delete clean.token;
  delete clean.accessToken;

  for (const key of Object.keys(clean)) {
    if (clean[key] && typeof clean[key] === 'object') {
      clean[key] = sanitizeAuditObject(clean[key]);
    }
  }

  return clean;
}

export const logAudit = async (options: AuditLogOptions) => {
  try {
    const { adminUserId, action, entityType, entityId, before, after, note, ipAddress, userAgent } = options;
    return await prisma.auditLog.create({
      data: {
        adminUserId: adminUserId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        before: before ? sanitizeAuditObject(before) : undefined,
        after: after ? sanitizeAuditObject(after) : undefined,
        note: note || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};
