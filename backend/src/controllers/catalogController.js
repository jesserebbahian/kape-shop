import { catalogService } from '../services/catalogService.js';
import { inventoryService, batchDto } from '../services/inventoryService.js';
import { batchRepo } from '../repositories/batches.js';
import { ok } from '../utils/response.js';

export const catalogController = {
  list: async (req, res) => {
    const { items, meta } = await catalogService.list(req.query);
    return ok(res, items, meta);
  },
  detail: async (req, res) => ok(res, await catalogService.detail(req.params.id)),
  openBatches: async (req, res) => ok(res, (await batchRepo.listOpen(new Date())).map(batchDto)),
  capacity: async (req, res) => ok(res, { remainingUnits: await inventoryService.remainingOpenUnits(new Date()) })
};
