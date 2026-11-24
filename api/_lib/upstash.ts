import { Redis } from '@upstash/redis';
import type { Store } from './household.js';

/**
 * Upstash Redis, added through the Vercel Marketplace (Storage tab). Depending on how it
 * was connected, Vercel names the variables KV_REST_API_* or UPSTASH_REDIS_REST_*.
 * Returns null when not configured, and the app then keeps working on each phone only.
 */
export function upstashStore(): Store | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Keep values as raw strings; we do our own JSON handling.
  const redis = new Redis({ url, token, automaticDeserialization: false });

  return {
    async readAll(keys) {
      const p = redis.pipeline();
      for (const k of keys) p.hgetall(k);
      const results = (await p.exec()) as (Record<string, string> | null)[];
      return results.map((r) => r ?? {});
    },
    async write(writes) {
      const tx = redis.multi(); // atomic: a batch of edits lands together
      for (const w of writes) {
        if (w.set && Object.keys(w.set).length) tx.hset(w.key, w.set);
        if (w.del?.length) tx.hdel(w.key, ...w.del);
      }
      await tx.exec();
    },
  };
}
