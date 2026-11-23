import { randomUUID } from 'node:crypto';
import { PaymentProvider } from './PaymentProvider.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { verifyMayaWebhook } from './mayaWebhookSignature.js';

const basic = (key) => `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
const toPesos = (cents) => Number((cents / 100).toFixed(2));
const toCents = (pesos) => Math.round(Number(pesos) * 100);

const mapStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case 'PAYMENT_SUCCESS':
      return 'paid';
    case 'PAYMENT_FAILED':
    case 'PAYMENT_CANCELLED':
    case 'PAYMENT_CANCELED':
      return 'failed';
    case 'PAYMENT_EXPIRED':
      return 'expired';
    default:
      return 'pending';
  }
};

export class MayaProvider extends PaymentProvider {
  get name() {
    return 'maya';
  }

  async #call(path, { method, key, body }) {
    if (!env.maya.publicKey || !env.maya.secretKey) {
      throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Maya sandbox keys are not configured');
    }
    let response;
    try {
      response = await fetch(`${env.maya.baseUrl}${path}`, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: basic(key) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not reach Maya');
    }
    const json = (await response.json().catch(() => null)) ?? {};
    if (!response.ok) {
      const code = typeof json.code === 'string' && /^[a-z0-9_-]{1,30}$/i.test(json.code) ? json.code : undefined;
      const reference = code ? `HTTP ${response.status}, Maya code ${code}` : `HTTP ${response.status}`;
      let message = `Maya could not process the request (${reference}). Try again shortly.`;
      if ([401, 403].includes(response.status)) {
        message = `Maya rejected the API credentials (${reference}). Check that the Maya Checkout keys match the configured environment.`;
      } else if ([400, 422].includes(response.status)) {
        message = `Maya rejected the payment details (${reference}). Ask the shop to check its Maya Checkout configuration.`;
      }
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', message, { status: response.status, code });
    }
    return json;
  }

  async createCheckout({ totalCents, description, urls }) {
    const value = toPesos(totalCents);
    const json = await this.#call('/checkout/v1/checkouts', {
      method: 'POST',
      key: env.maya.publicKey,
      body: {
        totalAmount: { value, currency: 'PHP' },
        items: [{ name: description, quantity: 1, amount: { value }, totalAmount: { value } }],
        redirectUrl: urls,
        requestReferenceNumber: randomUUID()
      }
    });
    const redirect = URL.canParse(json.redirectUrl) ? new URL(json.redirectUrl) : null;
    if (typeof json.checkoutId !== 'string' || !json.checkoutId || redirect?.protocol !== 'https:') {
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Maya did not return a valid checkout link');
    }
    return { ref: json.checkoutId, url: redirect.href };
  }

  async retrieveCheckout(ref) {
    const json = await this.#call(`/payments/v1/payments/${encodeURIComponent(ref)}`, { method: 'GET', key: env.maya.secretKey });
    const amount = json.amount ?? json.totalAmount?.value;
    return {
      ref,
      status: mapStatus(json.paymentStatus ?? json.status),
      amountCents: toCents(amount),
      currency: json.currency ?? json.totalAmount?.currency
    };
  }

  parseWebhook(rawBody, headers) {
    if (!headers['x-maya-webhook-signature']) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Maya webhook signature is missing');
    }
    let body;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError(400, 'MALFORMED_JSON', 'Webhook body is not valid JSON');
    }
    if (!verifyMayaWebhook(body, headers, env.maya.webhookPublicKeys)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Maya webhook signature or timestamp is invalid');
    }
    const ref = typeof body.id === 'string' ? body.id : null;
    const status = String(body?.paymentStatus ?? body?.status ?? 'UNKNOWN');
    return { eventId: `maya:${ref}:${status}`, type: status, ref: mapStatus(status) === 'pending' ? null : ref };
  }
}
