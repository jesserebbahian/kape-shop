import { env } from '../src/config/env.js';

if (env.prod) {
  console.error('Reset is disabled in production');
  process.exit(1);
}

const { initDb } = await import('../src/models/index.js');
const { closeDb } = await import('../src/config/database.js');
const { seedAll } = await import('./seedData.js');

await initDb({ force: true });
await seedAll();
console.log('Development database reset and reseeded');
await closeDb();
