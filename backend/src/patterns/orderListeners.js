import { orderEvents } from './orderEvents.js';
import { withTransaction } from '../config/database.js';
import { orderRepo } from '../repositories/orders.js';
import { batchRepo } from '../repositories/batches.js';
import { couponRepo } from '../repositories/coupons.js';
import { cartRepo } from '../repositories/cart.js';
import { logger } from '../utils/logger.js';

const releaseReservation = (orderId) =>
  withTransaction(async () => {
    const reservation = await orderRepo.findActiveReservation(orderId);
    if (!reservation) return;
    await orderRepo.setReservationStatus(orderId, 'released');
    await batchRepo.release(reservation.batch_id, reservation.units);
  });

const notify = ({ order, to }) => orderRepo.addNotification(order.user_id, order.id, `Order #${order.id} is now ${to.replace('_', ' ')}`);

const onRelease = async ({ order, to }) => {
  if (to !== 'cancelled' && to !== 'expired') return;
  await withTransaction(async () => {
    await releaseReservation(order.id);
    await couponRepo.releaseForOrder(order.id);
  });
};

const onPaid = async ({ order, to }) => {
  if (to !== 'paid') return;
  await orderRepo.setReservationStatus(order.id, 'consumed');
  await cartRepo.clear(order.user_id);
};

let registered = false;

export const registerOrderListeners = () => {
  if (registered) return;
  registered = true;
  for (const listener of [notify, onRelease, onPaid]) {
    orderEvents.on('order.transitioned', async (event) => {
      try {
        await listener(event);
      } catch (error) {
        logger.error('Order listener failed', { message: error.message });
      }
    });
  }
};
