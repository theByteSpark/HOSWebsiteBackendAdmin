import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { OrderStatus, OrderChannel, PaymentStatus } from '@prisma/client';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as OrderStatus | undefined;
    const channel = req.query.channel as OrderChannel | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const search = req.query.search as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true, whatsapp: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          items: true,
        },
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return sendSuccess(res, {
      orders,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch orders', 500, error);
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { include: { addresses: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    if (!order || order.deletedAt) {
      return sendError(res, 'Order not found', 404);
    }

    return sendSuccess(res, order);
  } catch (error) {
    return sendError(res, 'Failed to fetch order', 500, error);
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customerId,
      customerDetails, // { name, email, phone, whatsapp, address } if new customer
      items, // [{ productId, variantId, quantity, unitPrice, metalFinish, notes }]
      channel = OrderChannel.WHATSAPP,
      shippingAddress,
      discount = 0,
      tax = 0,
      paymentStatus = PaymentStatus.UNPAID,
      paymentMethod,
      customerNote,
      internalNotes,
      assignedToId,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order items are required', 400);
    }

    let targetCustomerId = customerId;

    // Create new customer if customerDetails provided
    if (!targetCustomerId && customerDetails) {
      const newCust = await prisma.customer.create({
        data: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone,
          whatsapp: customerDetails.whatsapp || customerDetails.phone,
          source: channel as any,
          addresses: customerDetails.address
            ? { create: [customerDetails.address] }
            : undefined,
        },
      });
      targetCustomerId = newCust.id;
    }

    if (!targetCustomerId) {
      return sendError(res, 'Customer ID or customerDetails is required', 400);
    }

    // Calculate subtotal and line items
    let subtotal = 0;
    const orderItemsData = items.map((item: any) => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName || 'Jewelry Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
        metalFinish: item.metalFinish || null,
        notes: item.notes || null,
      };
    });

    const total = subtotal + Number(tax) - Number(discount);
    const count = await prisma.order.count();
    const orderNumber = `HOS-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: targetCustomerId,
        assignedToId: assignedToId || req.user?.id,
        status: OrderStatus.PENDING,
        channel: channel as OrderChannel,
        subtotal,
        tax,
        discount,
        total,
        paymentStatus: paymentStatus as PaymentStatus,
        paymentMethod,
        customerNote,
        internalNotes,
        shippingAddress,
        timeline: [
          {
            status: OrderStatus.PENDING,
            timestamp: new Date().toISOString(),
            note: `Order created via ${channel}`,
            adminId: req.user?.id,
          },
        ],
        items: { create: orderItemsData },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Update customer total order value and order count
    await prisma.customer.update({
      where: { id: targetCustomerId },
      data: {
        orderCount: { increment: 1 },
        totalOrderValue: { increment: total },
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        type: 'ORDER_RECEIVED',
        title: 'New Order Received',
        body: `Order ${order.orderNumber} placed for ₹${total.toLocaleString('en-IN')}`,
        entityType: 'Order',
        entityId: order.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        adminUserId: req.user?.id,
        entityType: 'Order',
        entityId: order.id,
        after: order as any,
        note: `Created order ${order.orderNumber}`,
      },
    });

    return sendSuccess(res, order, 'Order created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create order', 500, error);
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, trackingNumber, courier, note } = req.body;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const currentTimeline = (order.timeline as any[]) || [];
    const newTimeline = [
      ...currentTimeline,
      {
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status changed to ${status}`,
        adminId: req.user?.id,
      },
    ];

    const updateData: any = {
      status: status as OrderStatus,
      timeline: newTimeline,
      ...(trackingNumber && { trackingNumber }),
      ...(courier && { courier }),
    };

    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        adminUserId: req.user?.id,
        entityType: 'Order',
        entityId: order.id,
        before: { status: order.status },
        after: { status: updatedOrder.status },
        note: `Order ${order.orderNumber} status changed to ${status}`,
      },
    });

    return sendSuccess(res, updatedOrder, 'Order status updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update order status', 500, error);
  }
};
