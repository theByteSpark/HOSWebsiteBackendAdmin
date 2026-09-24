import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Ensure uploads directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const ALLOWED_FOLDERS = ['products', 'collections', 'blogs', 'pages', 'homepage', 'general'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = (req.body.folder || 'general').toString().toLowerCase();
    if (!ALLOWED_FOLDERS.includes(folder)) {
      folder = 'general';
    }
    const safeFolder = path.basename(folder);
    const destDir = path.join(env.UPLOAD_DIR, safeFolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, GIF, SVG, and MP4 are allowed.'));
    }
  },
}).single('file');

export const uploadMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    let folder = (req.body.folder || 'general').toString().toLowerCase();
    if (!ALLOWED_FOLDERS.includes(folder)) {
      folder = 'general';
    }
    const publicUrl = `${env.PUBLIC_MEDIA_URL}/${folder}/${req.file.filename}`;

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        path: req.file.path,
        url: publicUrl,
        folder,
        altText: req.body.altText ? req.body.altText.toString() : null,
        uploadedBy: req.user?.id || 'system',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        adminUserId: req.user?.id,
        entityType: 'MediaAsset',
        entityId: mediaAsset.id,
        after: mediaAsset as any,
        note: `Uploaded media asset ${mediaAsset.originalName}`,
      },
    });

    return sendSuccess(res, mediaAsset, 'Media uploaded successfully', 201);
  } catch (error) {
    return sendError(res, 'Media upload failed', 500, error);
  }
};

export const getMediaAssets = async (req: Request, res: Response) => {
  try {
    const { folder, search, page = '1', limit = '30' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (folder) where.folder = folder as string;
    if (search) {
      where.OR = [
        { originalName: { contains: search as string, mode: 'insensitive' } },
        { altText: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return sendSuccess(res, {
      assets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch media assets', 500, error);
  }
};

export const deleteMediaAsset = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return sendError(res, 'Media asset not found', 404);
    }

    // Delete file from disk if it exists
    if (fs.existsSync(asset.path)) {
      fs.unlinkSync(asset.path);
    }

    await prisma.mediaAsset.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        adminUserId: req.user?.id,
        entityType: 'MediaAsset',
        entityId: id,
        before: asset as any,
        note: `Deleted media asset ${asset.filename}`,
      },
    });

    return sendSuccess(res, null, 'Media asset deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete media asset', 500, error);
  }
};
