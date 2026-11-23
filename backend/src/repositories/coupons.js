import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Coupon, CouponRedemption } from '../models/index.js';

export const couponRepo = {
  find: (code) => Coupon.findByPk(code, { raw: true }),
  list: () => Coupon.findAll({ order: [['code', 'ASC']], raw: true }),

  create: (c) =>
    Coupon.create({
      code: c.code,
      type: c.type,
      value: c.value,
      min_spend_cents: c.minSpendCents,
      expires_at: c.expiresAt ?? null,
      usage_limit: c.usageLimit ?? null,
      per_customer_limit: c.perCustomerLimit ?? null,
      active: c.active
    }),

  async update(code, p) {
    const values = {};
    if (p.active !== undefined) values.active = p.active;
    if (p.expiresAt !== undefined) values.expires_at = p.expiresAt;
    if (p.usageLimit !== undefined) values.usage_limit = p.usageLimit;
    if (!Object.keys(values).length) return 0;
    const [count] = await Coupon.update(values, { where: { code } });
    return count;
  },

  countRedemptions: (code, userId) => CouponRedemption.count({ where: { code, user_id: userId } }),

  async redeem({ code, orderId, userId }) {
    const [changed] = await Coupon.update(
      { used_count: sequelize.literal('used_count + 1') },
      { where: { code, [Op.and]: sequelize.literal('(usage_limit IS NULL OR used_count < usage_limit)') } }
    );
    if (changed !== 1) return false;
    await CouponRedemption.create({ order_id: orderId, user_id: userId, code });
    return true;
  },

  async releaseForOrder(orderId) {
    const row = await CouponRedemption.findOne({ where: { order_id: orderId }, raw: true });
    if (!row) return;
    await CouponRedemption.destroy({ where: { order_id: orderId } });
    await Coupon.update({ used_count: sequelize.literal('GREATEST(used_count - 1, 0)') }, { where: { code: row.code } });
  }
};
