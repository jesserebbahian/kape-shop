import { Op } from 'sequelize';
import { Order, OrderItem, Reservation, OrderStatusHistory, Notification, WebhookEvent, User } from '../models/index.js';

const PAID_STATES = ['paid', 'roasting', 'shipped', 'delivered'];

export const orderRepo = {
  async create(o) {
    const created = await Order.create({
      user_id: o.userId,
      batch_id: o.batchId,
      status: 'pending_payment',
      subtotal_cents: o.subtotalCents,
      discount_cents: o.discountCents,
      shipping_cents: o.shippingCents,
      total_cents: o.totalCents,
      coupon_code: o.couponCode ?? null,
      shipping_name: o.shippingName,
      shipping_phone: o.shippingPhone,
      shipping_address: o.shippingAddress,
      idempotency_key: o.idempotencyKey
    });
    return created.id;
  },

  addItem: (orderId, i) =>
    OrderItem.create({
      order_id: orderId,
      product_id: i.productId,
      product_name: i.name,
      size_g: i.sizeG,
      grind: i.grind,
      quantity: i.quantity,
      units: i.units,
      unit_price_cents: i.unitPriceCents,
      line_total_cents: i.lineTotalCents
    }),

  addReservation: ({ orderId, batchId, units, expiresAt }) =>
    Reservation.create({ order_id: orderId, batch_id: batchId, units, status: 'active', expires_at: expiresAt }),
  findActiveReservation: (orderId) => Reservation.findOne({ where: { order_id: orderId, status: 'active' }, raw: true }),
  setReservationStatus: (orderId, status) => Reservation.update({ status }, { where: { order_id: orderId } }),

  addHistory: (orderId, from, to, actor, note) =>
    OrderStatusHistory.create({ order_id: orderId, from_status: from, to_status: to, actor, note: note ?? null }),

  setStatusIf: (id, from, to, at) => Order.update({ status: to, updated_at: at }, { where: { id, status: from } }),
  setPayment: (id, provider, ref, url) => Order.update({ payment_provider: provider, payment_ref: ref, checkout_url: url, updated_at: new Date() }, { where: { id } }),
  flag: (id, reason) => Order.update({ flagged: true, flag_reason: reason.slice(0, 300), updated_at: new Date() }, { where: { id } }),

  findById: (id) => Order.findByPk(id, { raw: true }),
  findByKey: (userId, key) => Order.findOne({ where: { user_id: userId, idempotency_key: key }, raw: true }),
  findByPaymentRef: (ref) => Order.findOne({ where: { payment_ref: ref }, raw: true }),
  items: (orderId) => OrderItem.findAll({ where: { order_id: orderId }, order: [['id', 'ASC']], raw: true }),
  history: (orderId) => OrderStatusHistory.findAll({ where: { order_id: orderId }, order: [['id', 'ASC']], raw: true }),
  listByUser: (userId) => Order.findAll({ where: { user_id: userId }, order: [['id', 'DESC']], raw: true }),

  async listAdmin({ status, from, to, page, limit }) {
    const where = {};
    if (status) where.status = status;
    if (from || to) where.created_at = { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) };
    const { count, rows } = await Order.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset: (page - 1) * limit, raw: true });
    const users = rows.length ? await User.findAll({ where: { id: [...new Set(rows.map((r) => r.user_id))] }, attributes: ['id', 'email'], raw: true }) : [];
    const emails = new Map(users.map((u) => [u.id, u.email]));
    return { rows: rows.map((r) => ({ ...r, customer_email: emails.get(r.user_id) })), total: count };
  },

  async stalePending(at) {
    const reservations = await Reservation.findAll({ where: { status: 'active', expires_at: { [Op.lt]: at } }, raw: true });
    if (!reservations.length) return [];
    const orders = await Order.findAll({ where: { id: reservations.map((r) => r.order_id), status: 'pending_payment' }, attributes: ['id'], raw: true });
    return orders;
  },

  async stats() {
    return {
      paidOrders: await Order.count({ where: { status: PAID_STATES } }),
      grossSalesCents: Number(await Order.sum('total_cents', { where: { status: PAID_STATES } })) || 0,
      pendingOrders: await Order.count({ where: { status: 'pending_payment' } }),
      flaggedOrders: await Order.count({ where: { flagged: true } })
    };
  },

  addNotification: (userId, orderId, message) => Notification.create({ user_id: userId, order_id: orderId, message })
};

export const webhookRepo = {
  async insert(eventId, provider, type, payload) {
    try {
      await WebhookEvent.create({ event_id: eventId, provider, type, payload });
      return true;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') return false;
      throw error;
    }
  },
  remove: (eventId) => WebhookEvent.destroy({ where: { event_id: eventId } }),
  list: () => WebhookEvent.findAll({ attributes: ['event_id', 'provider', 'type', 'created_at'], order: [['created_at', 'DESC']], limit: 100, raw: true })
};
