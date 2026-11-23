import { withTransaction } from '../config/database.js';
import { batchRepo } from '../repositories/batches.js';
import { AppError } from '../utils/errors.js';

export const batchDto = (b) => ({
  id: b.id,
  roastDate: b.roast_date,
  cutoffAt: b.cutoff_at,
  capacityUnits: b.capacity_units,
  reservedUnits: b.reserved_units,
  remainingUnits: b.capacity_units - b.reserved_units,
  status: b.status
});

export const inventoryService = {
  async reserveFirstAvailable(units, at) {
    const open = await batchRepo.listOpen(at);
    if (!open.length) throw new AppError(409, 'BATCH_CLOSED', 'No roast batch is open for orders right now');
    for (const batch of open) {
      if (await batchRepo.reserve(batch.id, units, at)) return batch;
    }
    throw new AppError(409, 'BATCH_FULL', 'All open roast batches are full for this order size');
  },

  remainingOpenUnits: (at) => batchRepo.remainingTotal(at),

  async createBatch(body) {
    const id = await batchRepo.create(body);
    return batchDto(await batchRepo.findById(id));
  },

  adjustCapacity(batchId, delta, reason, actorId) {
    return withTransaction(async () => {
      const batch = await batchRepo.findById(batchId);
      if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Batch not found');
      const next = batch.capacity_units + delta;
      if (next < batch.reserved_units) {
        throw new AppError(409, 'CAPACITY_BELOW_RESERVED', 'Capacity cannot drop below units already reserved', { reservedUnits: batch.reserved_units });
      }
      if (next < 0) throw new AppError(409, 'NEGATIVE_CAPACITY', 'Capacity cannot be negative');
      await batchRepo.setCapacity(batchId, next);
      await batchRepo.logAdjustment({ batchId, previous: batch.capacity_units, next, reason, actorId });
      return batchDto(await batchRepo.findById(batchId));
    });
  }
};
