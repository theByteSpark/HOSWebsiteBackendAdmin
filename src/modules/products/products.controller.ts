import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { generateSlug } from '../../utils/slug';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const categoryId = req.query.categoryId as string | undefined;
    const categorySlug = req.query.categorySlug as string | undefined;
    const subcategorySlug = req.query.subcategorySlug as string | undefined;
    const search = req.query.search as string | undefined;
    const isPublished = req.query.isPublished as string | undefined;
    const inStock = req.query.inStock as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (isPublished === 'true') where.isPublished = true;
    if (isPublished === 'false') where.isPublished = false;
    if (inStock === 'true') where.inStock = true;

    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (subcategorySlug) {
      where.subcategory = { slug: subcategorySlug };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          seo: true,
          inventory: true,
        },
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return sendSuccess(res, {
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch products', 500, error);
  }
};

export const getProductByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        seo: true,
        inventory: true,
      },
    });

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    return sendSuccess(res, product);
  } catch (error) {
    return sendError(res, 'Failed to fetch product', 500, error);
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      sku,
      categoryId,
      subcategoryId,
      price,
      originalPrice,
      description,
      shortDescription,
      isPublished,
      inStock,
      isMadeToOrder,
      netWeightGrams,
      totalDiamondCt,
      totalDiamondPcs,
      diamondGrade,
      images,
      variants,
      seo,
      initialStock = 0,
    } = req.body;

    if (!name || !categoryId || price === undefined) {
      return sendError(res, 'Name, categoryId, and price are required', 400);
    }

    const prodSlug = slug || generateSlug(name);
    const existingSlug = await prisma.product.findUnique({ where: { slug: prodSlug } });
    if (existingSlug) {
      return sendError(res, 'Product slug already exists', 400);
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: prodSlug,
        sku,
        categoryId,
        subcategoryId,
        price,
        originalPrice,
        description,
        shortDescription,
        isPublished: isPublished !== undefined ? isPublished : false,
        inStock: inStock !== undefined ? inStock : true,
        isMadeToOrder: isMadeToOrder || false,
        netWeightGrams,
        totalDiamondCt,
        totalDiamondPcs,
        diamondGrade,
        images: images ? { create: images } : undefined,
        variants: variants ? { create: variants } : undefined,
        seo: seo ? { create: seo } : undefined,
        inventory: {
          create: {
            quantity: initialStock,
            reorderLevel: 3,
          },
        },
      },
      include: {
        category: true,
        subcategory: true,
        images: true,
        variants: true,
        seo: true,
        inventory: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        adminUserId: req.user?.id,
        entityType: 'Product',
        entityId: product.id,
        after: product as any,
        note: `Created product ${product.name}`,
      },
    });

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create product', 500, error);
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      slug,
      sku,
      categoryId,
      subcategoryId,
      price,
      originalPrice,
      description,
      shortDescription,
      isPublished,
      inStock,
      isMadeToOrder,
      netWeightGrams,
      totalDiamondCt,
      totalDiamondPcs,
      diamondGrade,
      images,
      variants,
      seo,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return sendError(res, 'Product not found', 404);
    }

    if (images && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: any, idx: number) => ({
            productId: id,
            url: img.url,
            altText: img.altText || null,
            sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx,
            isHover: Boolean(img.isHover),
          })),
        });
      }
    }

    if (variants && Array.isArray(variants)) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: id,
            metalFinish: v.metalFinish || 'Yellow Gold',
            swatchColor: v.swatchColor || null,
            priceOffset: v.priceOffset !== undefined ? v.priceOffset : null,
            isDefault: Boolean(v.isDefault),
            inStock: v.inStock !== undefined ? Boolean(v.inStock) : true,
          })),
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(sku !== undefined && { sku }),
        ...(categoryId && { categoryId }),
        ...(subcategoryId !== undefined && { subcategoryId }),
        ...(price !== undefined && { price }),
        ...(originalPrice !== undefined && { originalPrice }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(isPublished !== undefined && { isPublished }),
        ...(inStock !== undefined && { inStock }),
        ...(isMadeToOrder !== undefined && { isMadeToOrder }),
        ...(netWeightGrams !== undefined && { netWeightGrams }),
        ...(totalDiamondCt !== undefined && { totalDiamondCt }),
        ...(totalDiamondPcs !== undefined && { totalDiamondPcs }),
        ...(diamondGrade !== undefined && { diamondGrade }),
        ...(seo
          ? {
              seo: {
                upsert: {
                  create: seo,
                  update: seo,
                },
              },
            }
          : {}),
      },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        seo: true,
        inventory: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        adminUserId: req.user?.id,
        entityType: 'Product',
        entityId: updated.id,
        before: existing as any,
        after: updated as any,
        note: `Updated product ${updated.name}`,
      },
    });

    return sendSuccess(res, updated, 'Product updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update product', 500, error);
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Product not found', 404);
    }

    // Soft delete product
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        adminUserId: req.user?.id,
        entityType: 'Product',
        entityId: id,
        before: existing as any,
        note: `Soft deleted product ${existing.name}`,
      },
    });

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete product', 500, error);
  }
};

export const publishProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isPublished } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return sendError(res, 'Product not found', 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isPublished: isPublished !== undefined ? Boolean(isPublished) : !existing.isPublished },
    });

    return sendSuccess(res, updated, `Product ${updated.isPublished ? 'published' : 'unpublished'} successfully`);
  } catch (error) {
    return sendError(res, 'Failed to update product publish status', 500, error);
  }
};
