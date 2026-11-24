import { Redis } from '@upstash/redis';
import type { Store } from './household.js';

/**
 * Finds the Upstash REST credentials in the environment. Vercel names them
 * KV_REST_API_URL / KV_REST_API_TOKEN, optionally with a custom prefix chosen when
 * connecting the database (e.g. STORAGE_KV_REST_API_URL). Upstash's own dashboard calls
 * them UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Any of these work.
 */
export function findCredentials(env: Record<string, string | undefined>): { url: string; token: string } | null {
  const pairs: [string, string][] = [
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ];
  for (const [urlName, tokenName] of pairs) {
    if (env[urlName] && env[tokenName]) return { url: env[urlName]!, token: env[tokenName]! };
  }
  // Prefixed names, e.g. STORAGE_KV_REST_API_URL + STORAGE_KV_REST_API_TOKEN.
  for (const [name, url] of Object.entries(env)) {
    for (const [urlSuffix, tokenSuffix] of pairs) {
      if (!url || !name.endsWith(`_${urlSuffix}`)) continue;
      const token = env[name.slice(0, -urlSuffix.length) + tokenSuffix];
      if (token) return { url, token };
    }
  }
  return null;
}

/**
 * Upstash Redis store, or null when no database is connected. The app then keeps
 * working on each phone only.
 */
export function upstashStore(): Store | null {
  const creds = findCredentials(process.env);
  if (!creds) return null;
  const { url, token } = creds;

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
