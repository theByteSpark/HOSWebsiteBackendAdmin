import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Ensure uploads directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const ALLOWED_FOLDERS = ['products', 'collections', 'blogs', 'pages', 'homepage', 'general'];

// ─── Required aspect-ratio configs per upload context ────────────────────────
// Mirrors client/src/lib/imageUploadConfig.ts — keep in sync.

const CONTEXT_RATIOS: Record<string, { ratio: number; label: string; tolerance: number }> = {
  PRODUCT_GALLERY:       { ratio: 3 / 2,   label: '3:2',  tolerance: 0.03 },
  HOME_HERO_SLIDE:       { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  ABOUT_HERO:            { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  ABOUT_SECTION_PORTRAIT:{ ratio: 4 / 5,   label: '4:5',  tolerance: 0.03 },
  GIFTING_HERO:          { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  DIAMOND_HERO:          { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  DIAMOND_SECTION:       { ratio: 4 / 3,   label: '4:3',  tolerance: 0.03 },
  GOLD_VERMEIL_HERO:     { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  BLOG_COVER:            { ratio: 16 / 9,  label: '16:9', tolerance: 0.03 },
  CATEGORY_COVER:        { ratio: 1 / 1,   label: '1:1',  tolerance: 0.03 },
};

// ─── Multer storage ──────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = (req.body.folder || 'general').toString().toLowerCase();
    if (!ALLOWED_FOLDERS.includes(folder)) folder = 'general';
    const safeFolder = path.basename(folder);
    const destDir = path.join(env.UPLOAD_DIR, safeFolder);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, GIF, SVG, and MP4 are allowed.'));
    }
  },
}).single('file');

// ─── Upload handler ──────────────────────────────────────────────────────────

export const uploadMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // ── Backend image-dimension validation ───────────────────────────────────
    // Read the actual file from disk and inspect its dimensions with sharp.
    // This is defence-in-depth: the frontend should have cropped already, but
    // we never trust frontend-provided width/height values.

    const uploadContext = (req.body.uploadContext || '').toString().toUpperCase();
    const contextConfig = CONTEXT_RATIOS[uploadContext];

    if (contextConfig && req.file.mimetype.startsWith('image/')) {
      try {
        const meta = await sharp(req.file.path).metadata();
        const { width, height } = meta;

        if (width && height) {
          const uploadedRatio = width / height;
          const diff = Math.abs(uploadedRatio - contextConfig.ratio);

          if (diff > contextConfig.tolerance) {
            // Delete the already-saved file before responding
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            return res.status(400).json({
              success: false,
              message: `Image ratio is not supported. Required ratio is ${contextConfig.label}. Please crop the image and try again.`,
            });
          }
        }
      } catch (sharpErr) {
        // If sharp cannot read the file, delete it and reject
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return sendError(res, 'Image could not be processed. Please try another image.', 400, sharpErr);
      }
    }

    // ── Build public URL ─────────────────────────────────────────────────────

    let folder = (req.body.folder || 'general').toString().toLowerCase();
    if (!ALLOWED_FOLDERS.includes(folder)) folder = 'general';
    const publicUrl = `${env.PUBLIC_MEDIA_URL}/${folder}/${req.file.filename}`;

    // ── Create MediaAsset record ─────────────────────────────────────────────

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

// ─── List media assets ───────────────────────────────────────────────────────

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

// ─── Delete media asset ──────────────────────────────────────────────────────

export const deleteMediaAsset = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return sendError(res, 'Media asset not found', 404);
    }

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
