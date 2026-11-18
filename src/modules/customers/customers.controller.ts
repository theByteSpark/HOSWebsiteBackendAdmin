import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CustomerSource } from '@prisma/client';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          addresses: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return sendSuccess(res, {
      customers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch customers', 500, error);
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });

    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    return sendSuccess(res, customer);
  } catch (error) {
    return sendError(res, 'Failed to fetch customer', 500, error);
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, whatsapp, source, tags, notes, address } = req.body;
    if (!name) {
      return sendError(res, 'Customer name is required', 400);
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        whatsapp,
        source: source as CustomerSource,
        tags: tags || [],
        notes,
        addresses: address
          ? {
              create: [address],
            }
          : undefined,
      },
      include: { addresses: true },
    });


    return sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create customer', 500, error);
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email, phone, whatsapp, source, tags, notes } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Customer not found', 404);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(source && { source: source as CustomerSource }),
        ...(tags && { tags }),
        ...(notes !== undefined && { notes }),
      },
      include: { addresses: true },
    });


    return sendSuccess(res, updated, 'Customer updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update customer', 500, error);
  }
};
