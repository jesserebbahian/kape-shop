import bcrypt from 'bcryptjs';
import { User, Product, Coupon, Batch } from '../src/models/index.js';

const PRODUCTS = [
  ['Benguet Arabica', 'Single Origin', 'Benguet', 'medium', 'Brown sugar, red apple, cocoa', 32000],
  ['Sagada Yellow Bourbon', 'Single Origin', 'Sagada, Mountain Province', 'light', 'Honey, orange peel, jasmine', 38000],
  ['Kalinga Highland', 'Single Origin', 'Kalinga', 'medium', 'Caramel, walnut, soft citrus', 34000],
  ['Bukidnon Valley', 'Single Origin', 'Bukidnon', 'medium', 'Milk chocolate, almond, light fruit', 30000],
  ['Mt. Apo Arabica', 'Single Origin', 'Davao del Sur', 'light', 'Peach, tea, floral', 36000],
  ['Mt. Matutum Reserve', 'Single Origin', 'South Cotabato', 'medium', 'Toffee, plum, vanilla', 35000],
  ['Amadeo Barako', 'Barako', 'Amadeo, Cavite', 'dark', 'Dark chocolate, tobacco, spice', 26000],
  ['Batangas Liberica', 'Barako', 'Lipa, Batangas', 'dark', 'Jackfruit, smoky, woody', 28000],
  ['Sulu Robusta', 'Robusta', 'Sulu', 'dark', 'Bold, nutty, bittersweet cocoa', 22000],
  ['Davao Robusta', 'Robusta', 'Davao', 'dark', 'Roasted nuts, malt, thick body', 21000],
  ['Kape Alamid Style Naturals', 'Specialty', 'Kalinga', 'light', 'Berry jam, wine, brown sugar', 52000],
  ['Anaerobic Sagada', 'Specialty', 'Sagada, Mountain Province', 'light', 'Tropical fruit, rum, sweet', 56000],
  ['Honey Process Benguet', 'Specialty', 'Atok, Benguet', 'medium', 'Honey, mango, caramel', 44000],
  ['Morning Rush Blend', 'Blend', 'Benguet and Bukidnon', 'medium', 'Chocolate, nuts, balanced', 27000],
  ['Milk Coffee Blend', 'Blend', 'Sulu and Benguet', 'dark', 'Sweet, creamy, low acidity', 25000],
  ['Espresso Classico', 'Blend', 'Benguet and Davao', 'dark', 'Dark cocoa, caramel, full body', 28000],
  ['Iced Coffee Blend', 'Blend', 'Kalinga and Bukidnon', 'medium', 'Brown sugar, citrus, smooth', 26000],
  ['Decaf Highland', 'Specialty', 'Benguet', 'medium', 'Mild cocoa, hazelnut', 40000],
  ['Cordillera Reserve', 'Single Origin', 'Ifugao', 'light', 'Lemon, honey, black tea', 37000],
  ['Misamis Sunrise', 'Single Origin', 'Misamis Oriental', 'medium', 'Nutty, caramel, gentle fruit', 31000],
  ['Negros Light Roast', 'Single Origin', 'Negros Occidental', 'light', 'Floral, citrus, honey', 33000],
  ['Camiguin Island Blend', 'Blend', 'Camiguin', 'medium', 'Sweet, nutty, clean finish', 29000]
];

const COUPONS = [
  ['WELCOME10', 'percent', 10, 50000, null, null, 1],
  ['SAVE100', 'fixed', 10000, 100000, null, 200, 2],
  ['EXPIRED20', 'percent', 20, 0, new Date('2020-01-01T00:00:00.000Z'), null, 1]
];

const addDays = (days, hour) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

export const seedAll = async ({ withBatches = true } = {}) => {
  const users = [
    ['admin@kape.test', 'Kape Admin', 'Admin123!', 'admin'],
    ['juan@kape.test', 'Juan Dela Cruz', 'Customer123!', 'customer'],
    ['maria@kape.test', 'Maria Santos', 'Customer123!', 'customer']
  ];
  for (const [email, name, password, role] of users) {
    if (await User.findOne({ where: { email } })) continue;
    await User.create({ email, name, password_hash: await bcrypt.hash(password, 10), role });
  }

  for (const [name, category, origin, roast, notes, price] of PRODUCTS) {
    if (await Product.findOne({ where: { name } })) continue;
    await Product.create({
      name,
      category,
      origin,
      roast_level: roast,
      tasting_notes: notes,
      description: `${name} from ${origin}, roasted to order in small batches.`,
      base_price_cents: price
    });
  }

  for (const [code, type, value, minSpend, expiresAt, usageLimit, perCustomer] of COUPONS) {
    if (await Coupon.findByPk(code)) continue;
    await Coupon.create({ code, type, value, min_spend_cents: minSpend, expires_at: expiresAt, usage_limit: usageLimit, per_customer_limit: perCustomer });
  }

  if (withBatches && (await Batch.count()) === 0) {
    for (const [roastOffset, cutoffOffset] of [[7, 4], [14, 11], [21, 18]]) {
      await Batch.create({ roast_date: addDays(roastOffset, 0).toISOString().slice(0, 10), cutoff_at: addDays(cutoffOffset, 9), capacity_units: 40 });
    }
  }
};
