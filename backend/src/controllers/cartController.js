import { cartService } from '../services/cartService.js';
import { checkoutService } from '../services/checkoutService.js';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { ok, created } from '../utils/response.js';

const baseUrl = (req) => env.appUrl || req.get('origin') || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;

export const cartController = {
  view: async (req, res) => ok(res, await cartService.view(req.user.id)),
  add: async (req, res) => created(res, await cartService.add(req.user.id, req.body)),
  update: async (req, res) => ok(res, await cartService.update(req.user.id, req.params.id, req.body.quantity)),
  remove: async (req, res) => ok(res, await cartService.remove(req.user.id, req.params.id)),
  quote: async (req, res) => ok(res, await checkoutService.quote(req.user.id, req.body.couponCode)),
  checkout: async (req, res) => {
    const key = req.get('idempotency-key');
    if (!key || key.length < 8 || key.length > 80) {
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Send an Idempotency-Key header between 8 and 80 characters');
    }
    return created(res, await checkoutService.checkout(req.user, req.body, key, baseUrl(req)));
  }
};
