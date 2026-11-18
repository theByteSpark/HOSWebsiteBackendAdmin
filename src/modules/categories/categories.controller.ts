import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { generateSlug } from '../../utils/slug';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// ----------------------------------------------------
// PRODUCT CATEGORIES
// ----------------------------------------------------

export const getCategories = async (req: Request, res: Response) => {
  try {
    const includeSubcategories = req.query.includeSubcategories as string;
    const publishedOnly = req.query.publishedOnly as string;

    const where: any = {};
    if (publishedOnly === 'true') {
      where.isPublished = true;
    }

    const categories = await prisma.productCategory.findMany({
      where,
      include: {
        subcategories: includeSubcategories !== 'false',
        seo: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return sendSuccess(res, { categories });
  } catch (error) {
    return sendError(res, 'Failed to fetch categories', 500, error);
  }
};

export const getCategoryByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const category = await prisma.productCategory.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        subcategories: {
          include: { seo: true },
          orderBy: { sortOrder: 'asc' },
        },
        seo: true,
        products: {
          where: { isPublished: true, deletedAt: null },
          include: { images: true, variants: true },
        },
      },
    });

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    return sendSuccess(res, category);
  } catch (error) {
    return sendError(res, 'Failed to fetch category', 500, error);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, image, bannerImage, bannerTagline, sortOrder, isPublished, seo } = req.body;
    if (!name) {
      return sendError(res, 'Category name is required', 400);
    }

    const categorySlug = slug || generateSlug(name);
    const existing = await prisma.productCategory.findUnique({ where: { slug: categorySlug } });
    if (existing) {
      return sendError(res, 'Category slug already exists', 400);
    }

    const newCategory = await prisma.productCategory.create({
      data: {
        name,
        slug: categorySlug,
        image,
        bannerImage,
        bannerTagline,
        sortOrder: sortOrder || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
        seo: seo
          ? {
              create: {
                metaTitle: seo.metaTitle,
                metaDescription: seo.metaDescription,
                ogImageUrl: seo.ogImageUrl,
              },
            }
          : undefined,
      },
      include: { subcategories: true, seo: true },
    });


    return sendSuccess(res, newCategory, 'Category created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create category', 500, error);
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, slug, image, bannerImage, bannerTagline, sortOrder, isPublished, seo } = req.body;

    const existing = await prisma.productCategory.findUnique({ where: { id }, include: { seo: true } });
    if (!existing) {
      return sendError(res, 'Category not found', 404);
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(image !== undefined && { image }),
        ...(bannerImage !== undefined && { bannerImage }),
        ...(bannerTagline !== undefined && { bannerTagline }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isPublished !== undefined && { isPublished }),
        seo: seo
          ? {
              upsert: {
                create: {
                  metaTitle: seo.metaTitle,
                  metaDescription: seo.metaDescription,
                  ogImageUrl: seo.ogImageUrl,
                },
                update: {
                  metaTitle: seo.metaTitle,
                  metaDescription: seo.metaDescription,
                  ogImageUrl: seo.ogImageUrl,
                },
              },
            }
          : undefined,
      },
      include: { subcategories: true, seo: true },
    });


    return sendSuccess(res, updated, 'Category updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update category', 500, error);
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Category not found', 404);
    }

    const productCount = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    if (productCount > 0) {
      return sendError(res, `Cannot delete category "${existing.name}" because ${productCount} active product(s) are assigned to it. Please reassign or remove the products first.`, 400);
    }

    // Delete subcategories & SEO first
    await prisma.categorySEO.deleteMany({ where: { categoryId: id } });
    await prisma.subcategory.deleteMany({ where: { categoryId: id } });
    await prisma.productCategory.delete({ where: { id } });


    return sendSuccess(res, null, 'Category deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete category', 500, error);
  }
};

// ----------------------------------------------------
// SUBCATEGORIES
// ----------------------------------------------------

export const createSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, name, slug, sortOrder, isPublished, seo } = req.body;
    if (!categoryId || !name) {
      return sendError(res, 'Category ID and Subcategory name are required', 400);
    }

    const subSlug = slug || generateSlug(name);
    const existing = await prisma.subcategory.findUnique({ where: { slug: subSlug } });
    if (existing) {
      return sendError(res, 'Subcategory slug already exists', 400);
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        slug: subSlug,
        sortOrder: sortOrder || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
        seo: seo
          ? {
              create: {
                metaTitle: seo.metaTitle,
                metaDescription: seo.metaDescription,
                seoHeading: seo.seoHeading,
                seoIntro: seo.seoIntro,
                seoSections: seo.seoSections,
                whyUs: seo.whyUs,
                closingTitle: seo.closingTitle,
                closing: seo.closing,
                faqs: seo.faqs,
                ogImageUrl: seo.ogImageUrl,
              },
            }
          : undefined,
      },
      include: { seo: true },
    });


    return sendSuccess(res, subcategory, 'Subcategory created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create subcategory', 500, error);
  }
};

export const updateSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { categoryId, name, slug, sortOrder, isPublished, seo } = req.body;

    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Subcategory not found', 404);
    }

    const updated = await prisma.subcategory.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(name && { name }),
        ...(slug && { slug }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isPublished !== undefined && { isPublished }),
        seo: seo
          ? {
              upsert: {
                create: {
                  metaTitle: seo.metaTitle,
                  metaDescription: seo.metaDescription,
                  seoHeading: seo.seoHeading,
                  seoIntro: seo.seoIntro,
                  seoSections: seo.seoSections,
                  whyUs: seo.whyUs,
                  closingTitle: seo.closingTitle,
                  closing: seo.closing,
                  faqs: seo.faqs,
                  ogImageUrl: seo.ogImageUrl,
                },
                update: {
                  metaTitle: seo.metaTitle,
                  metaDescription: seo.metaDescription,
                  seoHeading: seo.seoHeading,
                  seoIntro: seo.seoIntro,
                  seoSections: seo.seoSections,
                  whyUs: seo.whyUs,
                  closingTitle: seo.closingTitle,
                  closing: seo.closing,
                  faqs: seo.faqs,
                  ogImageUrl: seo.ogImageUrl,
                },
              },
            }
          : undefined,
      },
      include: { seo: true },
    });


    return sendSuccess(res, updated, 'Subcategory updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update subcategory', 500, error);
  }
};

export const deleteSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.subcategory.findUnique({ where: { id } });

    const productCount = await prisma.product.count({ where: { subcategoryId: id, deletedAt: null } });
    if (productCount > 0) {
      return sendError(res, `Cannot delete subcategory because ${productCount} active product(s) are assigned to it.`, 400);
    }

    await prisma.subcategorySEO.deleteMany({ where: { subcategoryId: id } });
    await prisma.subcategory.delete({ where: { id } });


    return sendSuccess(res, null, 'Subcategory deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete subcategory', 500, error);
  }
};
