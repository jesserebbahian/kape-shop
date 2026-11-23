export class PaymentProvider {
  constructor() {
    if (new.target === PaymentProvider) throw new Error('PaymentProvider is abstract and cannot be instantiated');
  }

  get name() {
    throw new Error(`${this.constructor.name} must define name`);
  }

  async createCheckout() {
    throw new Error(`${this.constructor.name} must implement createCheckout`);
  }

  async retrieveCheckout() {
    throw new Error(`${this.constructor.name} must implement retrieveCheckout`);
  }

  parseWebhook() {
    throw new Error(`${this.constructor.name} must implement parseWebhook`);
  }
}
