import { orderService } from '../services/orderService.js';
import { paymentService } from '../services/paymentService.js';
import { ok } from '../utils/response.js';

export const orderController = {
  list: async (req, res) => ok(res, await orderService.listForUser(req.user.id)),
  detail: async (req, res) => ok(res, await orderService.detail(await orderService.getOwned(req.params.id, req.user))),
  cancel: async (req, res) => {
    const order = await orderService.getOwned(req.params.id, req.user);
    await orderService.cancelByCustomer(order);
    return ok(res, await orderService.detail(await orderService.getOwned(req.params.id, req.user)));
  },
  reconcile: async (req, res) => {
    const order = await orderService.getOwned(req.params.id, req.user);
    const { outcome } = await paymentService.verifyAndApply(order.id);
    return ok(res, { outcome, order: await orderService.detail(await orderService.getOwned(req.params.id, req.user)) });
  }
};
