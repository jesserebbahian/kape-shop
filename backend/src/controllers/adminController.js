import { catalogService } from '../services/catalogService.js';
import { couponService, couponDto } from '../services/couponService.js';
import { inventoryService } from '../services/inventoryService.js';
import { orderService } from '../services/orderService.js';
import { paymentService } from '../services/paymentService.js';
import { adminService } from '../services/adminService.js';
import { ok, created } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const adminController = {
  dashboard: async (req, res) => ok(res, await adminService.dashboard()),

  listProducts: async (req, res) => {
    const { items, meta } = await catalogService.list(req.query, { includeInactive: true });
    return ok(res, items, meta);
  },
  createProduct: async (req, res) => created(res, await catalogService.create(req.body)),
  updateProduct: async (req, res) => ok(res, await catalogService.update(req.params.id, req.body)),
  deleteProduct: async (req, res) => {
    await catalogService.remove(req.params.id);
    return res.status(204).end();
  },

  listBatches: async (req, res) => ok(res, await adminService.listBatches()),
  createBatch: async (req, res) => created(res, await inventoryService.createBatch(req.body)),
  adjustBatch: async (req, res) => ok(res, await inventoryService.adjustCapacity(req.params.id, req.body.delta, req.body.reason, req.user.id)),
  inventoryLog: async (req, res) => ok(res, await adminService.inventoryLog()),

  listCoupons: async (req, res) => ok(res, (await couponService.list()).map(couponDto)),
  createCoupon: async (req, res) => created(res, couponDto(await couponService.create(req.body))),
  updateCoupon: async (req, res) => ok(res, couponDto(await couponService.update(req.params.code, req.body))),

  listOrders: async (req, res) => {
    const { items, meta } = await adminService.listOrders(req.query);
    return ok(res, items, meta);
  },
  orderDetail: async (req, res) => ok(res, await orderService.detail(await orderService.getOwned(req.params.id, req.user))),
  updateOrderStatus: async (req, res) => {
    const order = await orderService.getOwned(req.params.id, req.user);
    if (req.body.status === 'cancelled' && order.status !== 'pending_payment') {
      throw new AppError(409, 'ORDER_NOT_CANCELLABLE', 'Only unpaid orders can be cancelled');
    }
    await orderService.transition(order.id, req.body.status, { actor: `admin:${req.user.id}` });
    return ok(res, await orderService.detail(await orderService.getOwned(req.params.id, req.user)));
  },
  reconcileOrder: async (req, res) => {
    const { outcome } = await paymentService.verifyAndApply(Number(req.params.id));
    return ok(res, { outcome, order: await orderService.detail(await orderService.getOwned(req.params.id, req.user)) });
  },

  webhookEvents: async (req, res) => ok(res, await adminService.webhookEvents())
};
