import { productRepo } from '../repositories/products.js';
import { AppError } from '../utils/errors.js';
import { inventoryService } from './inventoryService.js';
import { priceTable } from './pricingService.js';

export const productDto = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  origin: p.origin,
  roastLevel: p.roast_level,
  tastingNotes: p.tasting_notes,
  description: p.description,
  imageUrl: p.image_url,
  basePriceCents: p.base_price_cents,
  active: !!p.active
});

export const catalogService = {
  async list(query, { includeInactive = false } = {}) {
    const { rows, total } = await productRepo.search({
      q: query.q,
      category: query.category,
      roast: query.roast,
      minPriceCents: query.minPrice != null ? query.minPrice * 100 : undefined,
      maxPriceCents: query.maxPrice != null ? query.maxPrice * 100 : undefined,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      includeInactive
    });
    return { items: rows.map(productDto), meta: { total, page: query.page, limit: query.limit } };
  },

  async detail(id, { includeInactive = false } = {}) {
    const product = await productRepo.findById(id);
    if (!product || (!product.active && !includeInactive)) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    return { ...productDto(product), priceTable: priceTable(product), remainingRoastUnits: await inventoryService.remainingOpenUnits(new Date()) };
  },

  async create(body) {
    try {
      return productDto(await productRepo.findById(await productRepo.create(body)));
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError(409, 'PRODUCT_EXISTS', 'A product with this name already exists');
      throw error;
    }
  },

  async update(id, body) {
    if (!(await productRepo.findById(id))) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    try {
      await productRepo.update(id, body);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError(409, 'PRODUCT_EXISTS', 'A product with this name already exists');
      throw error;
    }
    return productDto(await productRepo.findById(id));
  },

  async remove(id) {
    if (!(await productRepo.findById(id))) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    if (await productRepo.isInOrders(id)) {
      throw new AppError(409, 'PRODUCT_IN_ORDERS', 'This product appears in past orders. Deactivate it instead of deleting it');
    }
    await productRepo.remove(id);
  }
};
