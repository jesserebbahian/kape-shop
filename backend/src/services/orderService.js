import { withTransaction } from '../config/database.js';
import { orderRepo } from '../repositories/orders.js';
import { AppError } from '../utils/errors.js';
import { OrderStateMachine } from '../patterns/OrderStateMachine.js';
import { orderEvents } from '../patterns/orderEvents.js';
import { logger } from '../utils/logger.js';

export const orderDto = (o) => ({
  id: o.id,
  status: o.status,
  batchId: o.batch_id,
  subtotalCents: o.subtotal_cents,
  discountCents: o.discount_cents,
  shippingCents: o.shipping_cents,
  totalCents: o.total_cents,
  couponCode: o.coupon_code,
  shippingName: o.shipping_name,
  shippingPhone: o.shipping_phone,
  shippingAddress: o.shipping_address,
  paymentProvider: o.payment_provider,
  paymentRef: o.payment_ref,
  checkoutUrl: o.status === 'pending_payment' ? o.checkout_url : null,
  flagged: !!o.flagged,
  flagReason: o.flag_reason,
  customerEmail: o.customer_email,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});

const detail = async (order) => ({
  ...orderDto(order),
  items: (await orderRepo.items(order.id)).map((i) => ({
    productId: i.product_id,
    name: i.product_name,
    sizeG: i.size_g,
    grind: i.grind,
    quantity: i.quantity,
    unitPriceCents: i.unit_price_cents,
    lineTotalCents: i.line_total_cents
  })),
  history: (await orderRepo.history(order.id)).map((h) => ({ from: h.from_status, to: h.to_status, actor: h.actor, note: h.note, at: h.created_at }))
});

export const orderService = {
  detail,

  async getOwned(id, user) {
    const order = await orderRepo.findById(id);
    if (!order || (order.user_id !== user.id && user.role !== 'admin')) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return order;
  },

  async listForUser(userId) {
    return (await orderRepo.listByUser(userId)).map(orderDto);
  },

  async transition(orderId, to, { actor = 'system', note = null } = {}) {
    const result = await withTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      if (!OrderStateMachine.canTransition(order.status, to)) {
        throw new AppError(409, 'ILLEGAL_TRANSITION', `An order cannot move from ${order.status} to ${to}`, {
          from: order.status,
          to,
          allowed: OrderStateMachine.allowedFrom(order.status)
        });
      }
      const [changed] = await orderRepo.setStatusIf(orderId, order.status, to, new Date());
      if (changed !== 1) throw new AppError(409, 'ILLEGAL_TRANSITION', 'The order status changed at the same time. Reload and try again');
      await orderRepo.addHistory(orderId, order.status, to, actor, note);
      return { order: { ...order, status: to }, from: order.status };
    });
    await orderEvents.emitAsync('order.transitioned', { order: result.order, from: result.from, to, actor });
    return result.order;
  },

  cancelByCustomer(order) {
    if (order.status !== 'pending_payment') {
      throw new AppError(409, 'ORDER_NOT_CANCELLABLE', 'Only unpaid orders can be cancelled');
    }
    return this.transition(order.id, 'cancelled', { actor: `user:${order.user_id}`, note: 'Cancelled by customer' });
  },

  async expireStale(verify) {
    const stale = await orderRepo.stalePending(new Date());
    for (const { id } of stale) {
      let outcome = null;
      if (verify) {
        try {
          outcome = await verify(id);
        } catch (error) {
          logger.warn('Payment check failed before expiry', { orderId: id, code: error.code });
        }
      }
      if (outcome?.outcome === 'paid') continue;
      const current = await orderRepo.findById(id);
      if (current?.status === 'pending_payment') {
        try {
          await this.transition(id, 'expired', { actor: 'system', note: 'Reservation window elapsed' });
        } catch (error) {
          if (error.code !== 'ILLEGAL_TRANSITION') throw error;
        }
      }
    }
    return stale.length;
  }
};
