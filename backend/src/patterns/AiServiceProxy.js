import { AiService } from './AiService.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

export class AiServiceProxy extends AiService {
  #target;
  #cache = new Map();
  #calls = [];

  constructor(target) {
    super();
    this.#target = target;
  }

  async recommend(query, candidates) {
    const key = `${query.toLowerCase()}|${candidates.map((c) => c.id).join(',')}`;
    const hit = this.#cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    const now = Date.now();
    this.#calls = this.#calls.filter((t) => now - t < 60000);
    if (this.#calls.length >= env.aiGlobalPerMinute) throw new AppError(503, 'AI_UNAVAILABLE', 'AI budget reached, try again shortly');
    this.#calls.push(now);

    const started = Date.now();
    try {
      const value = await this.#target.recommend(query, candidates);
      this.#cache.set(key, { value, at: Date.now() });
      logger.info('ai.recommend ok', { ms: Date.now() - started, candidates: candidates.length });
      return value;
    } catch (error) {
      logger.warn('ai.recommend failed', { ms: Date.now() - started, code: error.code });
      throw error;
    }
  }
}
