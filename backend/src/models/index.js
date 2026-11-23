import { DataTypes as D } from 'sequelize';
import { sequelize } from '../config/database.js';

const id = { type: D.INTEGER, autoIncrement: true, primaryKey: true };
const createdAt = { type: D.DATE, allowNull: false, defaultValue: D.NOW };
const fk = (table, extra = {}) => ({ type: D.INTEGER, allowNull: false, references: { model: table, key: 'id' }, ...extra });
const table = (tableName, extra = {}) => ({ tableName, timestamps: false, ...extra });
const oneOf = (...values) => ({ isIn: [values] });

export const User = sequelize.define('User', {
  id,
  email: { type: D.STRING(120), allowNull: false, unique: true },
  name: { type: D.STRING(80), allowNull: false },
  password_hash: { type: D.STRING(100), allowNull: false },
  role: { type: D.STRING(10), allowNull: false, validate: oneOf('customer', 'admin') },
  created_at: createdAt
}, table('users'));

export const Product = sequelize.define('Product', {
  id,
  name: { type: D.STRING(80), allowNull: false, unique: true },
  category: { type: D.STRING(30), allowNull: false },
  origin: { type: D.STRING(80), allowNull: false },
  roast_level: { type: D.STRING(10), allowNull: false, validate: oneOf('light', 'medium', 'dark') },
  tasting_notes: { type: D.STRING(200), allowNull: false, defaultValue: '' },
  description: { type: D.STRING(600), allowNull: false, defaultValue: '' },
  image_url: { type: D.STRING(300), allowNull: true },
  base_price_cents: { type: D.INTEGER, allowNull: false, validate: { min: 0 } },
  active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: createdAt
}, table('products', { indexes: [{ fields: ['active', 'category'] }] }));

export const Batch = sequelize.define('Batch', {
  id,
  roast_date: { type: D.DATEONLY, allowNull: false },
  cutoff_at: { type: D.DATE, allowNull: false },
  capacity_units: { type: D.INTEGER, allowNull: false },
  reserved_units: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: D.STRING(10), allowNull: false, defaultValue: 'open', validate: oneOf('open', 'closed') }
}, table('batches'));

export const InventoryLog = sequelize.define('InventoryLog', {
  id,
  batch_id: fk('batches'),
  previous_units: { type: D.INTEGER, allowNull: false },
  new_units: { type: D.INTEGER, allowNull: false },
  reason: { type: D.STRING(120), allowNull: false },
  actor_id: fk('users'),
  created_at: createdAt
}, table('inventory_log'));

export const Coupon = sequelize.define('Coupon', {
  code: { type: D.STRING(20), primaryKey: true },
  type: { type: D.STRING(10), allowNull: false, validate: oneOf('percent', 'fixed') },
  value: { type: D.INTEGER, allowNull: false },
  min_spend_cents: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
  expires_at: { type: D.DATE, allowNull: true },
  usage_limit: { type: D.INTEGER, allowNull: true },
  used_count: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
  per_customer_limit: { type: D.INTEGER, allowNull: true },
  active: { type: D.BOOLEAN, allowNull: false, defaultValue: true }
}, table('coupons'));

export const CartItem = sequelize.define('CartItem', {
  id,
  user_id: fk('users', { onDelete: 'CASCADE' }),
  product_id: fk('products', { onDelete: 'CASCADE' }),
  size_g: { type: D.INTEGER, allowNull: false, validate: oneOf(250, 500) },
  grind: { type: D.STRING(12), allowNull: false, validate: oneOf('whole_bean', 'filter', 'espresso') },
  quantity: { type: D.INTEGER, allowNull: false }
}, table('cart_items', { indexes: [{ unique: true, fields: ['user_id', 'product_id', 'size_g', 'grind'] }] }));

export const Order = sequelize.define('Order', {
  id,
  user_id: fk('users'),
  batch_id: fk('batches'),
  status: { type: D.STRING(20), allowNull: false },
  subtotal_cents: { type: D.INTEGER, allowNull: false },
  discount_cents: { type: D.INTEGER, allowNull: false },
  shipping_cents: { type: D.INTEGER, allowNull: false },
  total_cents: { type: D.INTEGER, allowNull: false },
  coupon_code: { type: D.STRING(20), allowNull: true },
  shipping_name: { type: D.STRING(80), allowNull: false },
  shipping_phone: { type: D.STRING(20), allowNull: false },
  shipping_address: { type: D.STRING(200), allowNull: false },
  idempotency_key: { type: D.STRING(80), allowNull: false },
  payment_provider: { type: D.STRING(20), allowNull: true },
  payment_ref: { type: D.STRING(120), allowNull: true, unique: true },
  checkout_url: { type: D.STRING(500), allowNull: true },
  flagged: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
  flag_reason: { type: D.STRING(300), allowNull: true },
  created_at: createdAt,
  updated_at: createdAt
}, table('orders', { indexes: [{ unique: true, fields: ['user_id', 'idempotency_key'] }, { fields: ['status', 'created_at'] }] }));

export const OrderItem = sequelize.define('OrderItem', {
  id,
  order_id: fk('orders', { onDelete: 'CASCADE' }),
  product_id: fk('products'),
  product_name: { type: D.STRING(80), allowNull: false },
  size_g: { type: D.INTEGER, allowNull: false },
  grind: { type: D.STRING(12), allowNull: false },
  quantity: { type: D.INTEGER, allowNull: false },
  units: { type: D.INTEGER, allowNull: false },
  unit_price_cents: { type: D.INTEGER, allowNull: false },
  line_total_cents: { type: D.INTEGER, allowNull: false }
}, table('order_items'));

export const Reservation = sequelize.define('Reservation', {
  id,
  order_id: fk('orders', { unique: true }),
  batch_id: fk('batches'),
  units: { type: D.INTEGER, allowNull: false },
  status: { type: D.STRING(10), allowNull: false, validate: oneOf('active', 'consumed', 'released') },
  expires_at: { type: D.DATE, allowNull: false }
}, table('reservations'));

export const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id,
  order_id: fk('orders', { onDelete: 'CASCADE' }),
  from_status: { type: D.STRING(20), allowNull: true },
  to_status: { type: D.STRING(20), allowNull: false },
  actor: { type: D.STRING(40), allowNull: false },
  note: { type: D.STRING(200), allowNull: true },
  created_at: createdAt
}, table('order_status_history'));

export const CouponRedemption = sequelize.define('CouponRedemption', {
  id,
  order_id: fk('orders', { unique: true }),
  user_id: fk('users'),
  code: { type: D.STRING(20), allowNull: false, references: { model: 'coupons', key: 'code' } }
}, table('coupon_redemptions'));

export const WebhookEvent = sequelize.define('WebhookEvent', {
  event_id: { type: D.STRING(200), primaryKey: true },
  provider: { type: D.STRING(20), allowNull: false },
  type: { type: D.STRING(60), allowNull: false },
  payload: { type: D.TEXT, allowNull: false },
  created_at: createdAt
}, table('webhook_events'));

export const Notification = sequelize.define('Notification', {
  id,
  user_id: fk('users'),
  order_id: { type: D.INTEGER, allowNull: true, references: { model: 'orders', key: 'id' } },
  message: { type: D.STRING(200), allowNull: false },
  created_at: createdAt
}, table('notifications'));

const CHECKS = [
  ['batches', 'batches_reserved_within_capacity', 'reserved_units >= 0 AND reserved_units <= capacity_units'],
  ['products', 'products_price_not_negative', 'base_price_cents >= 0'],
  ['coupons', 'coupons_value_positive', 'value > 0'],
  ['cart_items', 'cart_items_quantity_range', 'quantity BETWEEN 1 AND 10'],
  ['orders', 'orders_totals_not_negative', 'subtotal_cents >= 0 AND discount_cents >= 0 AND shipping_cents >= 0 AND total_cents >= 0']
];

export const syncSchema = async ({ force = false } = {}) => {
  await sequelize.sync({ force });
  for (const [tableName, name, expression] of CHECKS) {
    await sequelize.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ALTER TABLE ${tableName} ADD CONSTRAINT ${name} CHECK (${expression}); END IF; END $$;`
    );
  }
};

export const initDb = async (options) => {
  await sequelize.authenticate();
  await syncSchema(options);
};
