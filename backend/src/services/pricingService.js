import { discountFor, GRIND_SURCHARGE_CENTS, SHIPPING_FEE_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } from '../patterns/strategies.js';

export const unitsFor = (sizeG, quantity) => (sizeG / 250) * quantity;

export const unitPriceCents = (product, sizeG, grind) => {
  const gross = (product.base_price_cents + GRIND_SURCHARGE_CENTS[grind]) * (sizeG / 250);
  return sizeG === 500 ? Math.round(gross * 0.95) : gross;
};

export const priceTable = (product) => {
  const table = {};
  for (const size of [250, 500]) {
    table[size] = {};
    for (const grind of Object.keys(GRIND_SURCHARGE_CENTS)) table[size][grind] = unitPriceCents(product, size, grind);
  }
  return table;
};

export const priceLines = (rows) =>
  rows.map((r) => {
    const unitPrice = unitPriceCents({ base_price_cents: r.base_price_cents }, r.size_g, r.grind);
    return {
      cartItemId: r.id,
      productId: r.product_id,
      name: r.name,
      sizeG: r.size_g,
      grind: r.grind,
      quantity: r.quantity,
      units: unitsFor(r.size_g, r.quantity),
      unitPriceCents: unitPrice,
      lineTotalCents: unitPrice * r.quantity
    };
  });

export const computeTotals = (lines, coupon) => {
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discountCents = coupon ? discountFor(coupon.type).apply(subtotalCents, coupon) : 0;
  const discounted = subtotalCents - discountCents;
  const shippingCents = lines.length === 0 || discounted >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
  return { subtotalCents, discountCents, shippingCents, totalCents: discounted + shippingCents };
};
