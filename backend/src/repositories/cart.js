import { CartItem, Product } from '../models/index.js';

export const cartRepo = {
  async list(userId) {
    const items = await CartItem.findAll({ where: { user_id: userId }, order: [['id', 'ASC']], raw: true });
    if (!items.length) return [];
    const products = await Product.findAll({ where: { id: [...new Set(items.map((i) => i.product_id))] }, raw: true });
    const byId = new Map(products.map((p) => [p.id, p]));
    return items.map((i) => ({
      id: i.id,
      product_id: i.product_id,
      size_g: i.size_g,
      grind: i.grind,
      quantity: i.quantity,
      name: byId.get(i.product_id).name,
      base_price_cents: byId.get(i.product_id).base_price_cents,
      active: byId.get(i.product_id).active
    }));
  },

  findOwned: (id, userId) => CartItem.findOne({ where: { id, user_id: userId }, raw: true }),

  async upsert({ userId, productId, sizeG, grind, quantity }) {
    const existing = await CartItem.findOne({ where: { user_id: userId, product_id: productId, size_g: sizeG, grind } });
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 10);
      await existing.save();
      return existing.id;
    }
    return (await CartItem.create({ user_id: userId, product_id: productId, size_g: sizeG, grind, quantity })).id;
  },

  setQuantity: (id, quantity) => CartItem.update({ quantity }, { where: { id } }),
  remove: (id) => CartItem.destroy({ where: { id } }),
  clear: (userId) => CartItem.destroy({ where: { user_id: userId } })
};
