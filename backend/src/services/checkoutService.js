import { withTransaction } from '../config/database.js';
import { cartRepo } from '../repositories/cart.js';
import { couponRepo } from '../repositories/coupons.js';
import { orderRepo } from '../repositories/orders.js';
import { batchRepo } from '../repositories/batches.js';
import { AppError } from '../utils/errors.js';
import { addMinutes, now } from '../utils/time.js';
import { env } from '../config/env.js';
import { priceLines, computeTotals } from './pricingService.js';
import { couponService } from './couponService.js';
import { inventoryService, batchDto } from './inventoryService.js';
import { orderService } from './orderService.js';
import { paymentService } from './paymentService.js';

const loadPricedCart = async (userId, couponCode, at) => {
  const rows = await cartRepo.list(userId);
  if (!rows.length) throw new AppError(422, 'CART_EMPTY', 'Your cart is empty');
  if (rows.some((r) => !r.active)) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'An item in your cart is no longer available');
  const lines = priceLines(rows);
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const coupon = couponCode ? await couponService.validate(couponCode, subtotal, userId, at) : null;
  return { lines, coupon, totals: computeTotals(lines, coupon) };
};

export const checkoutService = {
  async quote(userId, couponCode) {
    const at = now();
    const { lines, coupon, totals } = await loadPricedCart(userId, couponCode, at);
    const units = lines.reduce((s, l) => s + l.units, 0);
    const open = (await batchRepo.listOpen(at)).find((b) => b.capacity_units - b.reserved_units >= units);
    return {
      items: lines,
      couponCode: coupon?.code ?? null,
      ...totals,
      units,
      batch: open ? batchDto(open) : null
    };
  },

  async checkout(user, body, idempotencyKey, baseUrl) {
    const existing = await orderRepo.findByKey(user.id, idempotencyKey);
    if (existing) return orderService.detail(existing);

    await orderService.expireStale((id) => paymentService.verifyAndApply(id));

    const at = now();
    const { lines, coupon, totals } = await loadPricedCart(user.id, body.couponCode, at);
    const units = lines.reduce((s, l) => s + l.units, 0);

    let orderId;
    try {
      orderId = await withTransaction(async () => {
        const batch = await inventoryService.reserveFirstAvailable(units, at);
        const id = await orderRepo.create({
          userId: user.id,
          batchId: batch.id,
          ...totals,
          couponCode: coupon?.code,
          shippingName: body.shippingName,
          shippingPhone: body.shippingPhone,
          shippingAddress: body.shippingAddress,
          idempotencyKey
        });
        for (const line of lines) await orderRepo.addItem(id, line);
        await orderRepo.addReservation({ orderId: id, batchId: batch.id, units, expiresAt: addMinutes(env.reservationMinutes) });
        if (coupon && !(await couponRepo.redeem({ code: coupon.code, orderId: id, userId: user.id }))) {
          throw new AppError(422, 'COUPON_EXHAUSTED', 'This coupon has reached its usage limit');
        }
        await orderRepo.addHistory(id, null, 'pending_payment', `user:${user.id}`, 'Order created');
        return id;
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const duplicate = await orderRepo.findByKey(user.id, idempotencyKey);
        if (duplicate) return orderService.detail(duplicate);
      }
      throw error;
    }

    try {
      await paymentService.createSession(await orderRepo.findById(orderId), user, baseUrl);
    } catch (error) {
      await orderService.transition(orderId, 'cancelled', { actor: 'system', note: 'Payment session could not be created' });
      throw error;
    }
    return orderService.detail(await orderRepo.findById(orderId));
  }
};
