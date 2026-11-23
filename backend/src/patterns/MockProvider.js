import { PaymentProvider } from './PaymentProvider.js';
import { MayaProvider } from './MayaProvider.js';

const sessions = new Map();

export class MockProvider extends PaymentProvider {
  static sessions = sessions;

  static settle(ref, status, amountCents) {
    const session = sessions.get(ref);
    sessions.set(ref, { ...session, status, amountCents: amountCents ?? session.amountCents });
  }

  get name() {
    return 'mock';
  }

  async createCheckout({ orderId, totalCents }) {
    const ref = `mock_${orderId}_${sessions.size + 1}`;
    sessions.set(ref, { status: 'pending', amountCents: totalCents, currency: 'PHP' });
    return { ref, url: `https://mock.pay/${ref}` };
  }

  async retrieveCheckout(ref) {
    const session = sessions.get(ref);
    if (!session) throw new Error('unknown mock session');
    return { ref, ...session };
  }

  parseWebhook(rawBody, headers, query) {
    return new MayaProvider().parseWebhook(rawBody, headers, query);
  }
}
