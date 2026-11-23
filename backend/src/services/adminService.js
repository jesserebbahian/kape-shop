import { orderRepo, webhookRepo } from '../repositories/orders.js';
import { batchRepo } from '../repositories/batches.js';
import { orderDto } from './orderService.js';
import { batchDto } from './inventoryService.js';

export const adminService = {
  async dashboard() {
    const stats = await orderRepo.stats();
    return {
      ...stats,
      lowCapacityBatches: (await batchRepo.lowCapacity(new Date(), 5)).map(batchDto)
    };
  },

  async listOrders(query) {
    const { rows, total } = await orderRepo.listAdmin(query);
    return { items: rows.map(orderDto), meta: { total, page: query.page, limit: query.limit } };
  },

  async listBatches() {
    return (await batchRepo.listAll()).map(batchDto);
  },
  inventoryLog: () => batchRepo.listLog(),
  webhookEvents: () => webhookRepo.list()
};
