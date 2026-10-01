import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { StockMovementType } from '@prisma/client';

export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '15';
    const search = req.query.search as string | undefined;
    const lowStock = req.query.lowStock as string | undefined;
    const lowStockOnly = req.query.lowStockOnly as string | undefined;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const isLowStock = lowStock === 'true' || lowStockOnly === 'true';

    const where: any = {
      product: { deletedAt: null },
    };

    if (search) {
      where.product = {
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const allItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            category: { select: { id: true, name: true } },
            images: { take: 1 },
          },
        },
        movements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const filtered = isLowStock
      ? allItems.filter((item) => item.quantity <= item.reorderLevel)
      : allItems;

    const total = filtered.length;
    const paginatedItems = filtered.slice(skip, skip + limitNum);

    return sendSuccess(res, {
      items: paginatedItems,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch inventory', 500, error);
  }
};

export const updateInventoryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reorderLevel, quantity } = req.body;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Inventory item not found', 404);
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(reorderLevel !== undefined && { reorderLevel: Number(reorderLevel) }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
      },
      include: { product: true },
    });

    return sendSuccess(res, updated, 'Inventory item updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update inventory item', 500, error);
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { inventoryItemId, type, quantity, reason } = req.body;

    if (!inventoryItemId || !type || quantity === undefined) {
      return sendError(res, 'inventoryItemId, type, and quantity are required', 400);
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) {
      return sendError(res, 'Inventory item not found', 404);
    }

    // Determine quantity delta: RESTOCK, RETURN positive; SALE, ADJUSTMENT can be negative
    const delta = type === 'RESTOCK' || type === 'RETURN' ? Math.abs(quantity) : quantity;
    const newQuantity = Math.max(0, item.quantity + delta);

    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: newQuantity },
        include: { product: true },
      }),
      prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type: type as StockMovementType,
          quantity: delta,
          reason,
          adminUserId: req.user?.id,
        },
      }),
    ]);

    // Check if low stock notification should be created
    if (newQuantity <= item.reorderLevel) {
      await prisma.notification.create({
        data: {
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          body: `Product "${updatedItem.product.name}" has reached low stock (${newQuantity} remaining).`,
          entityType: 'Product',
          entityId: updatedItem.productId,
        },
      });
    }


    return sendSuccess(res, { item: updatedItem, movement }, 'Stock adjusted successfully');
  } catch (error) {
    return sendError(res, 'Failed to adjust stock', 500, error);
  }
};
