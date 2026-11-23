import { initDb } from '../src/models/index.js';
import { closeDb } from '../src/config/database.js';
import { seedAll } from './seedData.js';

await initDb();
await seedAll();
console.log('Seed complete: 22 products, 5 categories, 1 admin, 2 customers, 3 coupons, 3 batches');
await closeDb();
