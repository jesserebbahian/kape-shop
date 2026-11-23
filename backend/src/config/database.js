import { AsyncLocalStorage } from 'node:async_hooks';
import { AsyncResource } from 'node:async_hooks';
import { Sequelize } from 'sequelize';
import { env } from './env.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env and paste your Supabase Session pooler connection string.');
}

const storage = new AsyncLocalStorage();

Sequelize.useCLS({
  run: (fn) => {
    const context = new Map();
    return storage.run(context, () => fn(context));
  },
  get: (key) => storage.getStore()?.get(key),
  set: (key, value) => storage.getStore()?.set(key, value),
  bind: (fn) => AsyncResource.bind(fn)
});

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(env.databaseUrl);
const useSsl = env.databaseSsl ? env.databaseSsl === 'true' : !isLocal;

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: env.dbPoolMax, min: 0, idle: 10000, acquire: 30000 },
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {}
});

export const withTransaction = (work) => {
  if (storage.getStore()?.get('transaction')) return work();
  return sequelize.transaction(() => work());
};

export const closeDb = () => sequelize.close();
