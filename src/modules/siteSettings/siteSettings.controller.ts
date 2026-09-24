import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getSiteSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      return sendError(res, 'Site settings not configured', 404);
    }

    return sendSuccess(res, settings);
  } catch (error) {
    return sendError(res, 'Failed to fetch site settings', 500, error);
  }
};

export const updateSiteSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settingsData = req.body;

    const existing = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });

    const updated = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ...settingsData,
      },
      create: {
        id: 'singleton',
        whatsappNumber: settingsData.whatsappNumber || '+919876543210',
        contactEmail: settingsData.contactEmail || 'concierge@houseofseya.com',
        announcementMessages: settingsData.announcementMessages || [],
        promises: settingsData.promises || [],
        pressNames: settingsData.pressNames || [],
        ...settingsData,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        adminUserId: req.user?.id,
        entityType: 'SiteSettings',
        entityId: 'singleton',
        before: existing as any,
        after: updated as any,
        note: `Updated site settings`,
      },
    });

    return sendSuccess(res, updated, 'Site settings updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update site settings', 500, error);
  }
};
