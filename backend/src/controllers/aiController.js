import { discoveryService } from '../services/discoveryService.js';
import { ok } from '../utils/response.js';

export const aiController = {
  discover: async (req, res) => ok(res, await discoveryService.discover(req.body.query))
};
