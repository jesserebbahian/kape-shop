import { z } from 'zod';
import { productRepo } from '../repositories/products.js';
import { GeminiAiService } from '../patterns/GeminiAiService.js';
import { AiServiceProxy } from '../patterns/AiServiceProxy.js';
import { AppError } from '../utils/errors.js';
import { productDto } from './catalogService.js';

const aiService = new AiServiceProxy(new GeminiAiService());

const picksSchema = z.object({
  picks: z.array(z.object({ productId: z.number().int(), reason: z.string().min(1) })).max(5)
});

const STOP = new Set(['the', 'and', 'for', 'with', 'something', 'want', 'need', 'looking', 'coffee', 'beans', 'that', 'this', 'under', 'low', 'high']);

const tokenize = (query) => [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);

const parsePicks = (text, allowedIds) => {
  const stripped = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let json;
  try {
    json = JSON.parse(stripped);
  } catch {
    throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned malformed JSON');
  }
  const parsed = picksSchema.safeParse(json);
  if (!parsed.success) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI output did not match the expected shape');
  const seen = new Set();
  const picks = [];
  for (const pick of parsed.data.picks) {
    if (!allowedIds.has(pick.productId) || seen.has(pick.productId)) continue;
    seen.add(pick.productId);
    picks.push({ productId: pick.productId, reason: pick.reason.slice(0, 160) });
  }
  if (!picks.length) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI did not return any valid products');
  return picks.slice(0, 3);
};

export const discoveryService = {
  async discover(query) {
    const candidates = await productRepo.searchForAi(tokenize(query), 12);
    const payload = candidates.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      origin: p.origin,
      roast: p.roast_level,
      notes: p.tasting_notes,
      pricePesos: p.base_price_cents / 100
    }));
    const byId = new Map(candidates.map((p) => [p.id, p]));

    let source = 'ai';
    let fallbackReason = null;
    let picks;
    try {
      const text = await aiService.recommend(query, payload);
      picks = parsePicks(text, new Set(byId.keys()));
    } catch (error) {
      source = 'keyword_fallback';
      fallbackReason = error.code || 'AI_UNAVAILABLE';
      picks = candidates.slice(0, 3).map((p) => ({ productId: p.id, reason: 'Matches your keywords' }));
    }

    return {
      source,
      aiAssisted: source === 'ai',
      fallbackReason,
      picks: picks.map((p) => ({ product: productDto(byId.get(p.productId)), reason: p.reason }))
    };
  }
};
