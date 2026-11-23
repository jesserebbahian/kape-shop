import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { env } from './config/env.js';
import { initDb } from './models/index.js';
import { userRepo } from './repositories/users.js';
import { createApp } from './app.js';
import { orderService } from './services/orderService.js';
import { paymentService } from './services/paymentService.js';
import { seedAll } from '../scripts/seedData.js';
import { logger } from './utils/logger.js';

await initDb();
if (!env.prod && (await userRepo.count()) === 0) await seedAll();

let frontendHandler = (req, res, next) => next();
const app = createApp({ frontend: (req, res, next) => frontendHandler(req, res, next) });
const server = http.createServer(app);

if (env.prod) {
  const dist = path.resolve('dist');
  const staticHandler = express.static(dist);
  frontendHandler = (req, res, next) =>
    staticHandler(req, res, (err) => (err ? next(err) : req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  frontendHandler = vite.middlewares;
}

setInterval(() => {
  orderService.expireStale((id) => paymentService.verifyAndApply(id)).catch((e) => logger.error('Expiry sweep failed', { message: e.message }));
}, 30000).unref();

server.listen(env.port, '0.0.0.0', () => logger.info(`Kape shop running on port ${env.port}`));
