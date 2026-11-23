export const GRIND_SURCHARGE_CENTS = { whole_bean: 0, filter: 1000, espresso: 1500 };
export const SHIPPING_FEE_CENTS = 10000;
export const FREE_SHIPPING_THRESHOLD_CENTS = 150000;

export class DiscountStrategy {
  apply() {
    throw new Error('DiscountStrategy.apply is not implemented');
  }
}

export class PercentDiscount extends DiscountStrategy {
  apply(subtotalCents, coupon) {
    return Math.floor((subtotalCents * coupon.value) / 100);
  }
}

export class FixedDiscount extends DiscountStrategy {
  apply(subtotalCents, coupon) {
    return Math.min(subtotalCents, coupon.value);
  }
}

const discounts = { percent: new PercentDiscount(), fixed: new FixedDiscount() };

export const discountFor = (type) => discounts[type];
