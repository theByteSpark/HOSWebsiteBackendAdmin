import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { generateSlug } from '../../utils/slug';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { FAQContext } from '@prisma/client';

// ----------------------------------------------------
// HERO SLIDES
// ----------------------------------------------------

export const getHeroSlides = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly as string;
    const slides = await prisma.heroSlide.findMany({
      where: activeOnly === 'true' ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
    return sendSuccess(res, { slides });
  } catch (error) {
    return sendError(res, 'Failed to fetch hero slides', 500, error);
  }
};

export const createHeroSlide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, tagline, image, cta, href, sortOrder, isActive } = req.body;
    if (!title || !image || !href) {
      return sendError(res, 'Title, image, and href are required', 400);
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title,
        tagline,
        image,
        cta,
        href,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return sendSuccess(res, slide, 'Hero slide created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create hero slide', 500, error);
  }
};

export const updateHeroSlide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.heroSlide.update({
      where: { id },
      data: req.body,
    });
    return sendSuccess(res, updated, 'Hero slide updated');
  } catch (error) {
    return sendError(res, 'Failed to update hero slide', 500, error);
  }
};

export const deleteHeroSlide = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.heroSlide.delete({ where: { id } });
    return sendSuccess(res, null, 'Hero slide deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete hero slide', 500, error);
  }
};

// ----------------------------------------------------
// REVIEWS
// ----------------------------------------------------

export const getReviews = async (req: Request, res: Response) => {
  try {
    const publishedOnly = req.query.publishedOnly as string;
    const reviews = await prisma.review.findMany({
      where: publishedOnly === 'true' ? { isPublished: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { reviews });
  } catch (error) {
    return sendError(res, 'Failed to fetch reviews', 500, error);
  }
};

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, location, quote, imageUrl, rating, productName, productId, verified, isPublished, source } = req.body;
    if (!name || !quote || !rating) {
      return sendError(res, 'Name, quote, and rating are required', 400);
    }

    const review = await prisma.review.create({
      data: {
        name,
        location,
        quote,
        imageUrl,
        rating,
        productName,
        productId,
        verified: verified || false,
        isPublished: isPublished !== undefined ? isPublished : true,
        source: source || 'Direct',
      },
    });

    return sendSuccess(res, review, 'Review created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create review', 500, error);
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.review.update({
      where: { id },
      data: req.body,
    });
    return sendSuccess(res, updated, 'Review updated');
  } catch (error) {
    return sendError(res, 'Failed to update review', 500, error);
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.review.delete({ where: { id } });
    return sendSuccess(res, null, 'Review deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete review', 500, error);
  }
};

// ----------------------------------------------------
// BLOGS
// ----------------------------------------------------

export const getBlogPosts = async (req: Request, res: Response) => {
  try {
    const publishedOnly = req.query.publishedOnly as string;
    const posts = await prisma.blogPost.findMany({
      where: publishedOnly === 'true' ? { isPublished: true } : undefined,
      include: { category: true, seo: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { posts });
  } catch (error) {
    return sendError(res, 'Failed to fetch blog posts', 500, error);
  }
};

export const getBlogPostByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const post = await prisma.blogPost.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { category: true, seo: true },
    });

    if (!post) {
      return sendError(res, 'Blog post not found', 404);
    }

    return sendSuccess(res, post);
  } catch (error) {
    return sendError(res, 'Failed to fetch blog post', 500, error);
  }
};

export const createBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, slug, excerpt, body, sections, imageUrl, categoryId, isPublished, seo } = req.body;
    if (!title) {
      return sendError(res, 'Title is required', 400);
    }

    const blogSlug = slug || generateSlug(title);
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: blogSlug,
        excerpt,
        body,
        sections,
        imageUrl,
        categoryId,
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
        seo: seo ? { create: seo } : undefined,
      },
      include: { category: true, seo: true },
    });

    return sendSuccess(res, post, 'Blog post created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create blog post', 500, error);
  }
};

export const updateBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, slug, excerpt, body, sections, imageUrl, categoryId, isPublished, seo } = req.body;

    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(body !== undefined && { body }),
        ...(sections !== undefined && { sections }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isPublished !== undefined && {
          isPublished,
          publishedAt: isPublished ? new Date() : null,
        }),
        ...(seo
          ? {
              seo: {
                upsert: { create: seo, update: seo },
              },
            }
          : {}),
      },
      include: { category: true, seo: true },
    });

    return sendSuccess(res, updated, 'Blog post updated');
  } catch (error) {
    return sendError(res, 'Failed to update blog post', 500, error);
  }
};

export const deleteBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.blogPost.delete({ where: { id } });
    return sendSuccess(res, null, 'Blog post deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete blog post', 500, error);
  }
};

// ----------------------------------------------------
// FAQS
// ----------------------------------------------------

export const getFAQs = async (req: Request, res: Response) => {
  try {
    const context = req.query.context as string;
    const isPublished = req.query.isPublished as string;
    const publishedFilter = isPublished === 'true' ? { isPublished: true } : isPublished === 'false' ? { isPublished: false } : undefined;

    const categories = await prisma.fAQCategory.findMany({
      include: {
        faqs: {
          where: {
            ...(context ? { context: context as FAQContext } : {}),
            ...(publishedFilter ? publishedFilter : {}),
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const flatFaqs = categories.flatMap((cat) =>
      cat.faqs.map((f) => ({
        ...f,
        category: {
          id: cat.id,
          name: cat.name,
          sortOrder: cat.sortOrder,
        },
      }))
    );

    return sendSuccess(res, { faqs: flatFaqs });
  } catch (error) {
    return sendError(res, 'Failed to fetch FAQs', 500, error);
  }
};

export const createFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, question, answer, context, sortOrder, isPublished } = req.body;
    if (!categoryId || !question || !answer) {
      return sendError(res, 'categoryId, question, and answer are required', 400);
    }

    const faq = await prisma.fAQ.create({
      data: {
        categoryId,
        question,
        answer,
        context: context || FAQContext.GENERAL,
        sortOrder: sortOrder || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
      },
    });

    return sendSuccess(res, faq, 'FAQ created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create FAQ', 500, error);
  }
};

export const updateFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.fAQ.update({
      where: { id },
      data: req.body,
    });
    return sendSuccess(res, updated, 'FAQ updated');
  } catch (error) {
    return sendError(res, 'Failed to update FAQ', 500, error);
  }
};

export const deleteFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.fAQ.delete({ where: { id } });
    return sendSuccess(res, null, 'FAQ deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete FAQ', 500, error);
  }
};

// ----------------------------------------------------
// PAGES (about, diamond-education, gold-vermeil, gifting, customise)
// ----------------------------------------------------

export const getPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.page.findMany({
      include: { seo: true },
    });
    return sendSuccess(res, { pages });
  } catch (error) {
    return sendError(res, 'Failed to fetch pages', 500, error);
  }
};

export const getPageBySlug = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { seo: true },
    });

    if (!page) {
      return sendError(res, 'Page not found', 404);
    }

    return sendSuccess(res, page);
  } catch (error) {
    return sendError(res, 'Failed to fetch page', 500, error);
  }
};

export const updatePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const { title, content, isPublished, seo } = req.body;

    const page = await prisma.page.upsert({
      where: { slug },
      update: {
        ...(title && { title }),
        ...(content && { content }),
        ...(isPublished !== undefined && { isPublished }),
        ...(seo
          ? {
              seo: {
                upsert: { create: seo, update: seo },
              },
            }
          : {}),
      },
      create: {
        slug,
        title: title || slug,
        content: content || {},
        isPublished: isPublished !== undefined ? isPublished : true,
        seo: seo ? { create: seo } : undefined,
      },
      include: { seo: true },
    });

    return sendSuccess(res, page, 'Page saved successfully');
  } catch (error) {
    return sendError(res, 'Failed to save page', 500, error);
  }
};

// ----------------------------------------------------
// NAVIGATION ITEMS
// ----------------------------------------------------

export const getNavigationItems = async (req: Request, res: Response) => {
  try {
    const rootItems = await prisma.navigationItem.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return sendSuccess(res, { navigation: rootItems });
  } catch (error) {
    return sendError(res, 'Failed to fetch navigation items', 500, error);
  }
};

export const createNavigationItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, href, parentId, sortOrder, isActive } = req.body;
    if (!label || !href) {
      return sendError(res, 'Label and href are required', 400);
    }

    const item = await prisma.navigationItem.create({
      data: {
        label,
        href,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { children: true },
    });

    return sendSuccess(res, item, 'Navigation item created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create navigation item', 500, error);
  }
};

export const updateNavigationItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { label, href, parentId, sortOrder, isActive } = req.body;

    const updated = await prisma.navigationItem.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(href && { href }),
        ...(parentId !== undefined && { parentId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { children: true },
    });

    return sendSuccess(res, updated, 'Navigation item updated');
  } catch (error) {
    return sendError(res, 'Failed to update navigation item', 500, error);
  }
};

export const deleteNavigationItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Delete children first
    await prisma.navigationItem.deleteMany({ where: { parentId: id } });
    await prisma.navigationItem.delete({ where: { id } });

    return sendSuccess(res, null, 'Navigation item deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete navigation item', 500, error);
  }
};

// ----------------------------------------------------
// FAQ CATEGORIES & BLOG CATEGORIES
// ----------------------------------------------------

export const getFAQCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.fAQCategory.findMany({
      include: { faqs: true },
      orderBy: { sortOrder: 'asc' },
    });
    return sendSuccess(res, { categories });
  } catch (error) {
    return sendError(res, 'Failed to fetch FAQ categories', 500, error);
  }
};

export const createFAQCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) return sendError(res, 'Name is required', 400);

    const category = await prisma.fAQCategory.create({
      data: { name, sortOrder: sortOrder || 0 },
    });
    return sendSuccess(res, category, 'FAQ Category created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create FAQ category', 500, error);
  }
};

export const deleteFAQCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.fAQ.deleteMany({ where: { categoryId: id } });
    await prisma.fAQCategory.delete({ where: { id } });
    return sendSuccess(res, null, 'FAQ Category deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete FAQ category', 500, error);
  }
};

