import { cartRepo } from '../repositories/cart.js';
import { productRepo } from '../repositories/products.js';
import { AppError } from '../utils/errors.js';
import { now } from '../utils/time.js';
import { priceLines, computeTotals } from './pricingService.js';
import { inventoryService } from './inventoryService.js';

const view = async (userId) => {
  const lines = priceLines(await cartRepo.list(userId));
  const totals = computeTotals(lines, null);
  return { items: lines, subtotalCents: totals.subtotalCents, units: lines.reduce((s, l) => s + l.units, 0) };
};

const assertCapacity = async (userId, extraUnits) => {
  const current = (await view(userId)).units;
  if (current + extraUnits > (await inventoryService.remainingOpenUnits(now()))) {
    throw new AppError(409, 'INSUFFICIENT_CAPACITY', 'Not enough roast capacity left for this quantity');
  }
};

export const cartService = {
  view,

  async add(userId, { productId, sizeG, grind, quantity }) {
    const product = await productRepo.findById(productId);
    if (!product || !product.active) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    await assertCapacity(userId, (sizeG / 250) * quantity);
    await cartRepo.upsert({ userId, productId, sizeG, grind, quantity });
    return view(userId);
  },

  async update(userId, itemId, quantity) {
    const item = await cartRepo.findOwned(itemId, userId);
    if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
    const extra = (item.size_g / 250) * (quantity - item.quantity);
    if (extra > 0) await assertCapacity(userId, extra);
    await cartRepo.setQuantity(itemId, quantity);
    return view(userId);
  },

  async remove(userId, itemId) {
    if (!(await cartRepo.findOwned(itemId, userId))) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
    await cartRepo.remove(itemId);
    return view(userId);
  }
};
