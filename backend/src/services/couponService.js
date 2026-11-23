import { couponRepo } from '../repositories/coupons.js';
import { AppError } from '../utils/errors.js';

export const couponService = {
  async validate(rawCode, subtotalCents, userId, now) {
    const code = String(rawCode).trim().toUpperCase();
    const coupon = await couponRepo.find(code);
    if (!coupon) throw new AppError(422, 'COUPON_NOT_FOUND', 'This coupon code does not exist');
    if (!coupon.active) throw new AppError(422, 'COUPON_INACTIVE', 'This coupon is not active');
    if (coupon.expires_at && new Date(coupon.expires_at) <= now) throw new AppError(422, 'COUPON_EXPIRED', 'This coupon has expired');
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) throw new AppError(422, 'COUPON_EXHAUSTED', 'This coupon has reached its usage limit');
    if (subtotalCents < coupon.min_spend_cents) {
      throw new AppError(422, 'COUPON_MIN_SPEND', 'Your order is below the minimum spend for this coupon', { minSpendCents: coupon.min_spend_cents });
    }
    if (coupon.per_customer_limit != null && (await couponRepo.countRedemptions(code, userId)) >= coupon.per_customer_limit) {
      throw new AppError(422, 'COUPON_USER_LIMIT', 'You have already used this coupon the maximum number of times');
    }
    return coupon;
  },

  list: () => couponRepo.list(),

  async create(body) {
    if (await couponRepo.find(body.code)) throw new AppError(409, 'COUPON_EXISTS', 'A coupon with this code already exists');
    await couponRepo.create(body);
    return couponRepo.find(body.code);
  },

  async update(code, body) {
    if (!(await couponRepo.find(code))) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    await couponRepo.update(code, body);
    return couponRepo.find(code);
  }
};

export const couponDto = (c) => ({
  code: c.code,
  type: c.type,
  value: c.value,
  minSpendCents: c.min_spend_cents,
  expiresAt: c.expires_at,
  usageLimit: c.usage_limit,
  usedCount: c.used_count,
  perCustomerLimit: c.per_customer_limit,
  active: !!c.active
});
