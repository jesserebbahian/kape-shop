import { paymentService } from '../services/paymentService.js';
import { ok } from '../utils/response.js';

export const webhookController = {
  receive: async (req, res) => {
    const result = await paymentService.handleWebhook(req.params.provider, req.body, req.headers, req.query);
    return ok(res, result);
  }
};
