import { env } from '../config/env.js';
import { orderRepo, webhookRepo } from '../repositories/orders.js';
import { PaymentFactory } from '../patterns/PaymentFactory.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { orderService } from './orderService.js';

export const paymentService = {
  async createSession(order, buyer, baseUrl) {
    const provider = PaymentFactory.create(env.paymentProvider);
    const target = (state) => `${baseUrl.replace(/\/+$/, '')}/payment/${state === 'success' ? 'success' : 'cancelled'}?orderId=${order.id}`;
    const session = await provider.createCheckout({
      orderId: order.id,
      totalCents: order.total_cents,
      description: `Kape order #${order.id}`,
      buyer,
      urls: { success: target('success'), failure: target('failure'), cancel: target('cancel') }
    });
    await orderRepo.setPayment(order.id, provider.name, session.ref, session.url);
    return session;
  },

  async verifyAndApply(orderId) {
    const order = await orderRepo.findById(orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!order.payment_ref) return { outcome: 'no_payment_session', order };
    if (!['pending_payment', 'expired', 'cancelled'].includes(order.status)) return { outcome: 'already_paid', order };

    const provider = PaymentFactory.create(order.payment_provider);
    const info = await provider.retrieveCheckout(order.payment_ref);

    if (info.status === 'paid') {
      if (info.currency !== 'PHP' || info.amountCents !== order.total_cents) {
        const reason = `AMOUNT_MISMATCH expected ${order.total_cents} PHP centavos, gateway reported ${info.amountCents} ${info.currency}`;
        await orderRepo.flag(order.id, reason);
        logger.warn('Payment amount mismatch', { orderId: order.id, expected: order.total_cents, received: info.amountCents, currency: info.currency });
        return { outcome: 'flagged', order: await orderRepo.findById(order.id) };
      }
      if (order.status !== 'pending_payment') {
        await orderRepo.flag(order.id, `PAID_AFTER_${order.status.toUpperCase()} payment received after the order was ${order.status}`);
        return { outcome: 'flagged', order: await orderRepo.findById(order.id) };
      }
      await orderService.transition(order.id, 'paid', { actor: `gateway:${provider.name}`, note: `Verified with ${provider.name}` });
      return { outcome: 'paid', order: await orderRepo.findById(order.id) };
    }

    if ((info.status === 'failed' || info.status === 'expired') && order.status === 'pending_payment') {
      const to = info.status === 'expired' ? 'expired' : 'cancelled';
      await orderService.transition(order.id, to, { actor: `gateway:${provider.name}`, note: `Payment ${info.status}` });
      return { outcome: info.status, order: await orderRepo.findById(order.id) };
    }

    return { outcome: 'pending', order };
  },

  async handleWebhook(providerName, rawBody, headers, query) {
    const provider = PaymentFactory.create(providerName);
    const event = provider.parseWebhook(rawBody, headers, query);
    const stored = await webhookRepo.insert(event.eventId, provider.name, event.type, rawBody.toString('utf8').slice(0, 4000));
    if (!stored) return { result: 'duplicate' };
    if (!event.ref) return { result: 'ignored' };
    const order = await orderRepo.findByPaymentRef(event.ref);
    if (!order) return { result: 'ignored' };
    try {
      await this.verifyAndApply(order.id);
    } catch (error) {
      await webhookRepo.remove(event.eventId);
      throw new AppError(502, 'PAYMENT_VERIFY_FAILED', 'Could not verify the payment with the gateway');
    }
    return { result: 'processed' };
  }
};
