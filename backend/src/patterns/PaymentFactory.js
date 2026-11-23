import { MayaProvider } from './MayaProvider.js';
import { PayMongoProvider } from './PayMongoProvider.js';
import { MockProvider } from './MockProvider.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const registry = {
  maya: () => new MayaProvider(),
  paymongo: () => new PayMongoProvider(),
  ...(env.isTest ? { mock: () => new MockProvider() } : {})
};

export const PaymentFactory = {
  create(name) {
    const build = registry[name];
    if (!build) throw new AppError(404, 'UNKNOWN_PROVIDER', `Unknown payment provider ${name}`);
    return build();
  }
};
