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
          variants: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { metalFinish: 'asc' },
          },
          seo: true,
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

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { isDefault: 'desc' },
        },
        seo: true,
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
      categoryId: bodyCategoryId,
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
      smallDiamondCt,
      totalDiamondPcs,
      diamondGrade,
      images,
      variants,
      seo,
      initialStock = 0,
    } = req.body;

    // The category is derived from the subcategory when it isn't sent.
    let categoryId: string | undefined = bodyCategoryId || undefined;
    if (!categoryId && subcategoryId) {
      const sub = await prisma.subcategory.findUnique({ where: { id: subcategoryId }, select: { categoryId: true } });
      if (!sub) {
        return sendError(res, 'Selected subcategory does not exist.', 400);
      }
      categoryId = sub.categoryId;
    }

    if (!name || !categoryId || price === undefined) {
      return sendError(res, 'Name, subcategory, and price are required', 400);
    }

    // Validate Category exists
    const categoryExists = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return sendError(res, `Selected category does not exist.`, 400);
    }

    // Validate Subcategory belongs to Category
    if (subcategoryId && subcategoryId !== '') {
      const subcat = await prisma.subcategory.findUnique({ where: { id: subcategoryId } });
      if (!subcat) {
        return sendError(res, `Selected subcategory does not exist.`, 400);
      }
      if (subcat.categoryId !== categoryId) {
        return sendError(res, `Selected subcategory "${subcat.name}" does not belong to the category "${categoryExists.name}".`, 400);
      }
    }

    const trimmedSku = sku && typeof sku === 'string' && sku.trim() !== '' ? sku.trim() : null;

    if (trimmedSku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: trimmedSku },
      });
      if (existingSku) {
        return sendError(res, `SKU code "${trimmedSku}" already exists.`, 400);
      }
    }

    const parsedOriginalPrice =
      originalPrice !== undefined && originalPrice !== null && originalPrice !== ''
        ? Number(originalPrice)
        : null;

    let baseSlug = slug || generateSlug(name);
    let prodSlug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug: prodSlug } })) {
      prodSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    if (sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        return sendError(res, 'Product SKU already exists', 400);
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: prodSlug,
        sku: trimmedSku,
        categoryId,
        subcategoryId: subcategoryId || null,
        price,
        originalPrice: parsedOriginalPrice,
        description: description || null,
        shortDescription: shortDescription || null,
        // New products always go live; they can be unpublished later.
        isPublished: true,
        inStock: inStock !== undefined ? inStock : true,
        isMadeToOrder: isMadeToOrder || false,
        netWeightGrams: netWeightGrams !== undefined && netWeightGrams !== null && netWeightGrams !== '' ? Number(netWeightGrams) : null,
        totalDiamondCt: totalDiamondCt !== undefined && totalDiamondCt !== null && totalDiamondCt !== '' ? Number(totalDiamondCt) : null,
        smallDiamondCt: smallDiamondCt !== undefined && smallDiamondCt !== null && smallDiamondCt !== '' ? Number(smallDiamondCt) : null,
        totalDiamondPcs: totalDiamondPcs !== undefined && totalDiamondPcs !== null && totalDiamondPcs !== '' ? Number(totalDiamondPcs) : null,
        diamondGrade: diamondGrade || null,
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
        variants: {
          include: { images: true },
        },
        seo: true,
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
      categoryId: bodyCategoryId,
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
      smallDiamondCt,
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

    // The category is derived from the subcategory when it isn't sent.
    let categoryId: string | undefined = bodyCategoryId || undefined;
    if (!categoryId && subcategoryId) {
      const sub = await prisma.subcategory.findUnique({ where: { id: subcategoryId }, select: { categoryId: true } });
      if (!sub) {
        return sendError(res, 'Selected subcategory does not exist.', 400);
      }
      categoryId = sub.categoryId;
    }

    const targetCategoryId = categoryId || existing.categoryId;
    const targetSubcategoryId = subcategoryId !== undefined ? (subcategoryId || null) : existing.subcategoryId;

    const categoryExists = await prisma.productCategory.findUnique({ where: { id: targetCategoryId } });
    if (!categoryExists) {
      return sendError(res, `Selected category does not exist.`, 400);
    }

    if (targetSubcategoryId) {
      const subcat = await prisma.subcategory.findUnique({ where: { id: targetSubcategoryId } });
      if (!subcat) {
        return sendError(res, `Selected subcategory does not exist.`, 400);
      }
      if (subcat.categoryId !== targetCategoryId) {
        return sendError(res, `Selected subcategory "${subcat.name}" does not belong to category "${categoryExists.name}".`, 400);
      }
    }

    let trimmedSku: string | null | undefined = undefined;
    if (sku !== undefined) {
      trimmedSku = sku && typeof sku === 'string' && sku.trim() !== '' ? sku.trim() : null;
      if (trimmedSku) {
        const existingSku = await prisma.product.findFirst({
          where: {
            sku: trimmedSku,
            id: { not: id },
          },
        });
        if (existingSku) {
          return sendError(res, `SKU code "${trimmedSku}" already exists.`, 400);
        }
      }
    }

    let parsedOriginalPrice: number | null | undefined = undefined;
    if (originalPrice !== undefined) {
      parsedOriginalPrice =
        originalPrice !== null && originalPrice !== ''
          ? Number(originalPrice)
          : null;
    }

    if (slug && slug !== existing.slug) {
      const slugOwner = await prisma.product.findUnique({ where: { slug } });
      if (slugOwner) {
        return sendError(res, 'Product slug already exists', 400);
      }
    }

    if (images && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: any, idx: number) => ({
            productId: id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl || null,
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
        ...(trimmedSku !== undefined && { sku: trimmedSku }),
        ...(categoryId && { categoryId }),
        ...(subcategoryId !== undefined && { subcategoryId: subcategoryId || null }),
        ...(price !== undefined && { price }),
        ...(parsedOriginalPrice !== undefined && { originalPrice: parsedOriginalPrice }),
        ...(description !== undefined && { description: description || null }),
        ...(shortDescription !== undefined && { shortDescription: shortDescription || null }),
        ...(isPublished !== undefined && { isPublished }),
        ...(inStock !== undefined && { inStock }),
        ...(isMadeToOrder !== undefined && { isMadeToOrder }),
        ...(netWeightGrams !== undefined && { netWeightGrams: netWeightGrams !== null && netWeightGrams !== '' ? Number(netWeightGrams) : null }),
        ...(totalDiamondCt !== undefined && { totalDiamondCt: totalDiamondCt !== null && totalDiamondCt !== '' ? Number(totalDiamondCt) : null }),
        ...(smallDiamondCt !== undefined && { smallDiamondCt: smallDiamondCt !== null && smallDiamondCt !== '' ? Number(smallDiamondCt) : null }),
        ...(totalDiamondPcs !== undefined && { totalDiamondPcs: totalDiamondPcs !== null && totalDiamondPcs !== '' ? Number(totalDiamondPcs) : null }),
        ...(diamondGrade !== undefined && { diamondGrade: diamondGrade || null }),
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
        variants: {
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        seo: true,
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

// ============================================================
// VARIANT CRUD
// ============================================================

export const createVariant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = String(req.params.id);
    const { metalFinish, swatchColor, priceOffset, isDefault, inStock, sku } = req.body;

    if (!metalFinish) return sendError(res, 'metalFinish is required', 400);

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.deletedAt) return sendError(res, 'Product not found', 404);

    const variant = await prisma.productVariant.create({
      data: { productId, metalFinish, swatchColor, priceOffset, isDefault: isDefault || false, inStock: inStock !== false, sku },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });


    return sendSuccess(res, variant, 'Variant created', 201);
  } catch (error) {
    return sendError(res, 'Failed to create variant', 500, error);
  }
};

export const updateVariant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const variantId = String(req.params.variantId);
    const { metalFinish, swatchColor, priceOffset, isDefault, inStock, sku } = req.body;

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return sendError(res, 'Variant not found', 404);

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(metalFinish !== undefined && { metalFinish }),
        ...(swatchColor !== undefined && { swatchColor }),
        ...(priceOffset !== undefined && { priceOffset }),
        ...(isDefault !== undefined && { isDefault }),
        ...(inStock !== undefined && { inStock }),
        ...(sku !== undefined && { sku }),
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });


    return sendSuccess(res, updated, 'Variant updated');
  } catch (error) {
    return sendError(res, 'Failed to update variant', 500, error);
  }
};

export const deleteVariant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const variantId = String(req.params.variantId);
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return sendError(res, 'Variant not found', 404);

    await prisma.productVariant.delete({ where: { id: variantId } });


    return sendSuccess(res, null, 'Variant deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete variant', 500, error);
  }
};

// ============================================================
// VARIANT IMAGE CRUD
// ============================================================

export const addVariantImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const variantId = String(req.params.variantId);
    const { url, thumbnailUrl, altText, sortOrder, isPrimary } = req.body;

    if (!url) return sendError(res, 'url is required', 400);

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return sendError(res, 'Variant not found', 404);

    // Enforce hard limit of 5 total images per product across all variants
    const totalProductImagesCount = await prisma.variantImage.count({
      where: {
        variant: {
          productId: variant.productId,
        },
      },
    });

    if (totalProductImagesCount >= 5) {
      return sendError(res, 'A product can have a maximum of 5 images.', 400);
    }

    // If this is set as primary, clear existing primary
    if (isPrimary) {
      await prisma.variantImage.updateMany({ where: { variantId, isPrimary: true }, data: { isPrimary: false } });
    }

    const image = await prisma.variantImage.create({
      data: { variantId, url, thumbnailUrl: thumbnailUrl || null, altText, sortOrder: sortOrder ?? 0, isPrimary: isPrimary || false },
    });


    return sendSuccess(res, image, 'Image added', 201);
  } catch (error) {
    return sendError(res, 'Failed to add image', 500, error);
  }
};

export const deleteVariantImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const imageId = String(req.params.imageId);
    const img = await prisma.variantImage.findUnique({ where: { id: imageId } });
    if (!img) return sendError(res, 'Image not found', 404);

    await prisma.variantImage.delete({ where: { id: imageId } });


    return sendSuccess(res, null, 'Image deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete image', 500, error);
  }
};

// Body: { images: [{ id, sortOrder, isPrimary }] }
export const reorderVariantImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const variantId = String(req.params.variantId);
    const { images } = req.body as { images: { id: string; sortOrder: number; isPrimary?: boolean }[] };

    if (!Array.isArray(images)) return sendError(res, 'images array required', 400);

    await prisma.$transaction(
      images.map((img) =>
        prisma.variantImage.update({
          where: { id: img.id },
          data: { sortOrder: img.sortOrder, ...(img.isPrimary !== undefined && { isPrimary: img.isPrimary }) },
        })
      )
    );

    const updated = await prisma.variantImage.findMany({
      where: { variantId },
      orderBy: { sortOrder: 'asc' },
    });


    return sendSuccess(res, updated, 'Images reordered');
  } catch (error) {
    return sendError(res, 'Failed to reorder images', 500, error);
  }
};
