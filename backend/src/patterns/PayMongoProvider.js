import { PaymentProvider } from './PaymentProvider.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { hmacHex, safeEqual } from './webhookSecurity.js';

const basic = (key) => `Basic ${Buffer.from(`${key}:`).toString('base64')}`;

export class PayMongoProvider extends PaymentProvider {
  get name() {
    return 'paymongo';
  }

  async #call(path, method, body) {
    if (!env.payMongo.secretKey) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'PayMongo test key is not configured');
    let response;
    try {
      response = await fetch(`https://api.paymongo.com/v1${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: basic(env.payMongo.secretKey) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not reach PayMongo');
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'PayMongo rejected the request', { status: response.status });
    return json;
  }

  async createCheckout({ orderId, totalCents, description, urls }) {
    const json = await this.#call('/checkout_sessions', 'POST', {
      data: {
        attributes: {
          line_items: [{ currency: 'PHP', amount: totalCents, name: description, quantity: 1 }],
          payment_method_types: ['gcash', 'paymaya', 'card'],
          success_url: urls.success,
          cancel_url: urls.cancel,
          description,
          reference_number: `kape-${orderId}`
        }
      }
    });
    return { ref: json.data.id, url: json.data.attributes.checkout_url };
  }

  async retrieveCheckout(ref) {
    const json = await this.#call(`/checkout_sessions/${encodeURIComponent(ref)}`, 'GET');
    const attrs = json.data.attributes;
    const payment = attrs.payments?.[0]?.attributes;
    if (payment?.status === 'paid') return { ref, status: 'paid', amountCents: payment.amount, currency: payment.currency || 'PHP' };
    if (payment?.status === 'failed') return { ref, status: 'failed', amountCents: 0, currency: 'PHP' };
    if (attrs.status === 'expired') return { ref, status: 'expired', amountCents: 0, currency: 'PHP' };
    return { ref, status: 'pending', amountCents: 0, currency: 'PHP' };
  }

  parseWebhook(rawBody, headers) {
    const header = String(headers['paymongo-signature'] || '');
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
    const expected = parts.t && env.payMongo.webhookSecret ? hmacHex(env.payMongo.webhookSecret, `${parts.t}.${rawBody.toString('utf8')}`) : '';
    if (!safeEqual(parts.te || parts.li, expected)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
    }
    let body;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError(400, 'MALFORMED_JSON', 'Webhook body is not valid JSON');
    }
    const attrs = body?.data?.attributes;
    return { eventId: `paymongo:${body?.data?.id}`, type: String(attrs?.type ?? 'unknown'), ref: attrs?.data?.id ?? null };
  }
}
