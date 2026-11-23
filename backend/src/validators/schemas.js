import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max);
const intParam = z.coerce.number().int().positive();

export const idParams = z.object({ id: intParam }).strict();

export const registerBody = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(72),
  name: text(2, 80)
}).strict();

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(72)
}).strict();

const category = z.enum(['Single Origin', 'Blend', 'Barako', 'Robusta', 'Specialty']);
const roast = z.enum(['light', 'medium', 'dark']);

export const productQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: category.optional(),
  roast: roast.optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).strict();

export const productBody = z.object({
  name: text(2, 80),
  category,
  origin: text(2, 80),
  roastLevel: roast,
  tastingNotes: z.string().trim().max(200).default(''),
  description: z.string().trim().max(600).default(''),
  imageUrl: z.string().trim().max(300).refine((v) => /^https?:\/\//.test(v) || v.startsWith('/products/'), { message: 'Use a full link or a /products/ file path' }).nullable().optional(),
  basePriceCents: z.number().int().min(0).max(1000000),
  active: z.boolean().default(true)
}).strict();

export const productPatch = productBody.extend({
  tastingNotes: productBody.shape.tastingNotes.removeDefault(),
  description: productBody.shape.description.removeDefault(),
  active: productBody.shape.active.removeDefault()
}).partial().strict();

export const cartItemBody = z.object({
  productId: z.number().int().positive(),
  sizeG: z.union([z.literal(250), z.literal(500)]),
  grind: z.enum(['whole_bean', 'filter', 'espresso']),
  quantity: z.number().int().min(1).max(10)
}).strict();

export const cartPatchBody = z.object({ quantity: z.number().int().min(1).max(10) }).strict();

export const quoteBody = z.object({ couponCode: z.string().trim().max(30).optional() }).strict();

export const checkoutBody = z.object({
  shippingName: text(2, 80),
  shippingPhone: text(7, 20),
  shippingAddress: text(8, 200),
  couponCode: z.string().trim().max(30).optional()
}).strict();

export const couponBody = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/),
  type: z.enum(['percent', 'fixed']),
  value: z.number().int().min(1).max(1000000),
  minSpendCents: z.number().int().min(0).default(0),
  expiresAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().default(true)
}).strict().refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'Percent value must be 100 or less', path: ['value'] });

export const couponPatch = z.object({
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional()
}).strict();

export const codeParams = z.object({ code: z.string().trim().toUpperCase().max(30) }).strict();

export const batchBody = z.object({
  roastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cutoffAt: z.string().datetime(),
  capacityUnits: z.number().int().min(1).max(10000)
}).strict();

export const adjustBody = z.object({
  delta: z.number().int().refine((n) => n !== 0, { message: 'Delta must not be zero' }),
  reason: text(3, 120)
}).strict();

export const orderStatusBody = z.object({ status: z.enum(['roasting', 'shipped', 'delivered', 'cancelled']) }).strict();

export const adminOrderQuery = z.object({
  status: z.enum(['pending_payment', 'paid', 'roasting', 'shipped', 'delivered', 'cancelled', 'expired']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();

export const aiBody = z.object({ query: text(2, 200) }).strict();

export const providerParams = z.object({ provider: z.enum(['maya', 'paymongo']) }).strict();
