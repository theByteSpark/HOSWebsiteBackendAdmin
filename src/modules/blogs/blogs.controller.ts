import { Request, Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { Prisma, BlogStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { generateSlug } from '../../utils/slug';
import { sanitizeBlogHtml, htmlToPlainText } from '../../utils/sanitizeHtml';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { removeUnusedMediaByUrls, uploadMedia } from '../media/media.controller';

// ─── Validation ──────────────────────────────────────────────────────────────

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional()
  );

const blogBodySchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  slug: z.string().trim().max(200).optional(),
  excerpt: optionalText(500),
  coverImage: optionalText(1000),
  coverImageAlt: optionalText(200),
  content: z.string().min(1, 'Content is required').max(500_000),
  metaTitle: optionalText(70),
  metaDescription: optionalText(320),
  metaKeywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  status: z.nativeEnum(BlogStatus).optional(),
});

const cleanKeywords = (list?: string[]) =>
  Array.from(new Set((list || []).map((k) => k.trim()).filter(Boolean)));

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = generateSlug(base) || 'blog';
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.blog.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
    candidate = `${root}-${n++}`;
  }
}

const zodMessage = (err: z.ZodError) => err.errors.map((e) => e.message).join(', ');

// ─── Admin ───────────────────────────────────────────────────────────────────

export const listBlogsAdmin = async (req: Request, res: Response) => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);

    const where: Prisma.BlogWhereInput = {};
    if (status === 'DRAFT' || status === 'PUBLISHED') where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: {
          id: true, slug: true, title: true, coverImage: true, status: true,
          publishedAt: true, authorName: true, createdAt: true, updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.blog.count({ where }),
    ]);

    return sendSuccess(res, { blogs, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    return sendError(res, 'Failed to fetch blogs', 500, error);
  }
};

export const getBlogAdmin = async (req: Request, res: Response) => {
  try {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id as string } });
    if (!blog) return sendError(res, 'Blog not found', 404);
    return sendSuccess(res, blog);
  } catch (error) {
    return sendError(res, 'Failed to fetch blog', 500, error);
  }
};

export const createBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = blogBodySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, zodMessage(parsed.error), 400);
    const d = parsed.data;

    const content = sanitizeBlogHtml(d.content);
    if (!htmlToPlainText(content) && !/<img/i.test(content)) {
      return sendError(res, 'Content is required', 400);
    }
    const status = d.status ?? BlogStatus.DRAFT;
    const author = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });

    const blog = await prisma.blog.create({
      data: {
        title: d.title,
        slug: await uniqueSlug(d.slug || d.title),
        excerpt: d.excerpt || htmlToPlainText(content).slice(0, 180) || null,
        coverImage: d.coverImage ?? null,
        coverImageAlt: d.coverImageAlt ?? null,
        content,
        metaTitle: d.metaTitle ?? null,
        metaDescription: d.metaDescription ?? null,
        metaKeywords: cleanKeywords(d.metaKeywords),
        status,
        publishedAt: status === BlogStatus.PUBLISHED ? new Date() : null,
        authorId: req.user!.id,
        authorName: author?.name ?? null,
      },
    });
    return sendSuccess(res, blog, 'Blog created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create blog', 500, error);
  }
};

export const updateBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Blog not found', 404);

    const parsed = blogBodySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, zodMessage(parsed.error), 400);
    const d = parsed.data;

    const content = sanitizeBlogHtml(d.content);
    if (!htmlToPlainText(content) && !/<img/i.test(content)) {
      return sendError(res, 'Content is required', 400);
    }
    const status = d.status ?? existing.status;
    const newCover = d.coverImage === undefined ? existing.coverImage : d.coverImage;

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        title: d.title,
        slug: d.slug ? await uniqueSlug(d.slug, id) : existing.slug,
        excerpt: d.excerpt || htmlToPlainText(content).slice(0, 180) || null,
        coverImage: newCover ?? null,
        coverImageAlt: d.coverImageAlt ?? null,
        content,
        metaTitle: d.metaTitle ?? null,
        metaDescription: d.metaDescription ?? null,
        metaKeywords: cleanKeywords(d.metaKeywords),
        status,
        publishedAt:
          status === BlogStatus.PUBLISHED ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
    });

    // Cover was replaced or removed → clean the orphaned file out of the media library.
    if (existing.coverImage && existing.coverImage !== blog.coverImage) {
      await removeUnusedMediaByUrls([existing.coverImage]);
    }
    return sendSuccess(res, blog, 'Blog updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update blog', 500, error);
  }
};

export const setBlogStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const status = req.body?.status as BlogStatus;
    if (status !== BlogStatus.DRAFT && status !== BlogStatus.PUBLISHED) {
      return sendError(res, 'status must be DRAFT or PUBLISHED', 400);
    }
    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Blog not found', 404);

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        status,
        publishedAt: status === BlogStatus.PUBLISHED ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
    });
    return sendSuccess(res, blog, status === BlogStatus.PUBLISHED ? 'Blog published' : 'Blog moved to draft');
  } catch (error) {
    return sendError(res, 'Failed to update blog status', 500, error);
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Blog not found', 404);

    await prisma.blog.delete({ where: { id } });

    const inline = Array.from(existing.content.matchAll(/<img[^>]+src="([^"]+)"/g)).map((m) => m[1]);
    await removeUnusedMediaByUrls([...(existing.coverImage ? [existing.coverImage] : []), ...inline]);

    return sendSuccess(res, null, 'Blog deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete blog', 500, error);
  }
};

// ─── Blog-only image upload ──────────────────────────────────────────────────
// SEO managers have no access to /media. This route runs after multer and pins the
// upload to the "blogs" folder and to image types, whatever the client sent.

export const forceBlogUpload = (req: Request, res: Response, next: () => void) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (file && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return sendError(res, 'Only JPG, PNG, WEBP or GIF images are allowed.', 400);
  }
  const wantsCover = req.body?.uploadContext === 'BLOG_COVER';
  req.body = { folder: 'blogs', uploadContext: wantsCover ? 'BLOG_COVER' : '', altText: req.body?.altText };
  next();
};

export { uploadMedia as uploadBlogImage };

// ─── Public (storefront) ─────────────────────────────────────────────────────

const publicSelect = {
  id: true, slug: true, title: true, excerpt: true, coverImage: true, coverImageAlt: true,
  metaTitle: true, metaDescription: true, metaKeywords: true,
  publishedAt: true, updatedAt: true, authorName: true,
} satisfies Prisma.BlogSelect;

export const listBlogsPublic = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 50);
    const where = { status: BlogStatus.PUBLISHED };

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: publicSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);
    res.set('Cache-Control', 'public, max-age=60');
    return sendSuccess(res, { blogs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(res, 'Failed to fetch blogs', 500, error);
  }
};

export const getBlogPublic = async (req: Request, res: Response) => {
  try {
    const blog = await prisma.blog.findFirst({
      where: { slug: req.params.slug as string, status: BlogStatus.PUBLISHED },
      select: { ...publicSelect, content: true },
    });
    if (!blog) return sendError(res, 'Blog not found', 404);
    res.set('Cache-Control', 'public, max-age=60');
    return sendSuccess(res, blog);
  } catch (error) {
    return sendError(res, 'Failed to fetch blog', 500, error);
  }
};

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const blogSitemap = async (_req: Request, res: Response) => {
  try {
    const blogs = await prisma.blog.findMany({
      where: { status: BlogStatus.PUBLISHED },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    const urls = [
      `  <url><loc>${xmlEscape(env.SITE_URL + '/blogs')}</loc></url>`,
      ...blogs.map(
        (b) =>
          `  <url><loc>${xmlEscape(`${env.SITE_URL}/blogs/${b.slug}`)}</loc><lastmod>${b.updatedAt.toISOString()}</lastmod></url>`
      ),
    ];
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
    );
  } catch (error) {
    return sendError(res, 'Failed to build sitemap', 500, error);
  }
};
