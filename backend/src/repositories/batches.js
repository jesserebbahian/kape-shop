import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Batch, InventoryLog } from '../models/index.js';

const whole = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error('Expected an integer');
  return n;
};

export const batchRepo = {
  listOpen: (at) => Batch.findAll({ where: { status: 'open', cutoff_at: { [Op.gt]: at } }, order: [['roast_date', 'ASC'], ['id', 'ASC']], raw: true }),
  listAll: () => Batch.findAll({ order: [['roast_date', 'DESC'], ['id', 'DESC']], raw: true }),
  findById: (id) => Batch.findByPk(id, { raw: true }),
  count: () => Batch.count(),

  create: async ({ roastDate, cutoffAt, capacityUnits }) =>
    (await Batch.create({ roast_date: roastDate, cutoff_at: cutoffAt, capacity_units: capacityUnits })).id,

  async reserve(id, units, at) {
    const n = whole(units);
    const [changed] = await Batch.update(
      { reserved_units: sequelize.literal(`reserved_units + ${n}`) },
      {
        where: {
          id,
          status: 'open',
          cutoff_at: { [Op.gt]: at },
          [Op.and]: sequelize.literal(`reserved_units + ${n} <= capacity_units`)
        }
      }
    );
    return changed === 1;
  },

  async release(id, units) {
    const n = whole(units);
    await Batch.update({ reserved_units: sequelize.literal(`GREATEST(reserved_units - ${n}, 0)`) }, { where: { id } });
  },

  setCapacity: (id, capacity) => Batch.update({ capacity_units: capacity }, { where: { id } }),

  async remainingTotal(at) {
    const open = await batchRepo.listOpen(at);
    return open.reduce((sum, b) => sum + (b.capacity_units - b.reserved_units), 0);
  },

  async lowCapacity(at, threshold) {
    const open = await batchRepo.listOpen(at);
    return open.filter((b) => b.capacity_units - b.reserved_units <= threshold);
  },

  logAdjustment: ({ batchId, previous, next, reason, actorId }) =>
    InventoryLog.create({ batch_id: batchId, previous_units: previous, new_units: next, reason, actor_id: actorId }),

  listLog: () => InventoryLog.findAll({ order: [['id', 'DESC']], limit: 100, raw: true })
};
