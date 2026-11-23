import { Op } from 'sequelize';
import { Product, OrderItem } from '../models/index.js';

const SORTS = {
  newest: [['created_at', 'DESC'], ['id', 'DESC']],
  price_asc: [['base_price_cents', 'ASC'], ['id', 'ASC']],
  price_desc: [['base_price_cents', 'DESC'], ['id', 'ASC']]
};

const COLUMNS = {
  name: 'name',
  category: 'category',
  origin: 'origin',
  roastLevel: 'roast_level',
  tastingNotes: 'tasting_notes',
  description: 'description',
  imageUrl: 'image_url',
  basePriceCents: 'base_price_cents',
  active: 'active'
};

export const productRepo = {
  async search({ q, category, roast, minPriceCents, maxPriceCents, sort, page, limit, includeInactive = false }) {
    const where = {};
    if (!includeInactive) where.active = true;
    if (q) {
      const like = { [Op.iLike]: `%${q}%` };
      where[Op.or] = [{ name: like }, { origin: like }, { tasting_notes: like }];
    }
    if (category) where.category = category;
    if (roast) where.roast_level = roast;
    if (minPriceCents != null || maxPriceCents != null) {
      where.base_price_cents = {
        ...(minPriceCents != null ? { [Op.gte]: minPriceCents } : {}),
        ...(maxPriceCents != null ? { [Op.lte]: maxPriceCents } : {})
      };
    }
    const { count, rows } = await Product.findAndCountAll({ where, order: SORTS[sort], limit, offset: (page - 1) * limit, raw: true });
    return { rows, total: count };
  },

  async searchForAi(tokens, limit) {
    const all = await Product.findAll({ where: { active: true }, order: [['id', 'ASC']], raw: true });
    if (!tokens.length) return all.sort((a, b) => b.id - a.id).slice(0, limit);
    const scored = all.map((p) => {
      const haystack = [p.name, p.origin, p.category, p.roast_level, p.tasting_notes, p.description].join(' ').toLowerCase();
      return { product: p, score: tokens.filter((t) => haystack.includes(t)).length };
    });
    scored.sort((a, b) => b.score - a.score || a.product.id - b.product.id);
    return scored.filter((s, i) => s.score > 0 || i < 6).slice(0, limit).map((s) => s.product);
  },

  findById: (id) => Product.findByPk(id, { raw: true }),

  async create(p) {
    const created = await Product.create({
      name: p.name,
      category: p.category,
      origin: p.origin,
      roast_level: p.roastLevel,
      tasting_notes: p.tastingNotes,
      description: p.description,
      image_url: p.imageUrl ?? null,
      base_price_cents: p.basePriceCents,
      active: p.active
    });
    return created.id;
  },

  async update(id, p) {
    const values = {};
    for (const [key, column] of Object.entries(COLUMNS)) {
      if (p[key] !== undefined) values[column] = p[key];
    }
    if (!Object.keys(values).length) return 0;
    const [count] = await Product.update(values, { where: { id } });
    return count;
  },

  isInOrders: async (id) => (await OrderItem.count({ where: { product_id: id } })) > 0,
  remove: (id) => Product.destroy({ where: { id } })
};
