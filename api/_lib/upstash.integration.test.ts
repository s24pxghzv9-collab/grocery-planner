/*
 * Runs the real @upstash/redis client against a fake Upstash REST server (stubbed fetch),
 * so differences between the in-memory store and real Redis responses get caught.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyOps } from '../../src/lib/ops';
import { initialState } from '../../src/lib/store';
import type { AppState, Op } from '../../src/types';
import { handle } from './household';
import { upstashStore } from './upstash';

function fakeUpstash() {
  const db = new Map<string, Map<string, string>>();
  const run = ([cmd, key, ...args]: string[]): unknown => {
    const h = db.get(key) ?? new Map<string, string>();
    switch (cmd.toLowerCase()) {
      case 'hset':
        for (let i = 0; i < args.length; i += 2) h.set(args[i], args[i + 1]);
        db.set(key, h);
        return args.length / 2;
      case 'hdel':
        return args.filter((f) => h.delete(f)).length;
      case 'hgetall':
        return [...h.entries()].flat(); // real Upstash shape: flat array
      default:
        throw new Error(`fake upstash: unsupported ${cmd}`);
    }
  };
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body));
    const isBatch = url.endsWith('/pipeline') || url.endsWith('/multi-exec');
    const result = isBatch ? (body as string[][]).map((c) => ({ result: run(c) })) : { result: run(body) };
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  });
}

const call = (method: string, ops?: Op[]) =>
  handle(
    new Request('http://x/api/household', {
      method,
      body: ops ? JSON.stringify({ ops }) : undefined,
      headers: { 'content-type': 'application/json' },
    }),
    upstashStore(),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('household API on the real Upstash client', () => {
  it('saves edits and reads them back', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://fake.upstash.io');
    vi.stubEnv('KV_REST_API_TOKEN', 'token');
    vi.stubGlobal('fetch', fakeUpstash());

    expect(((await (await call('GET')).json()) as { empty: boolean }).empty).toBe(true);

    const ops: Op[] = [
      { t: 'plan', date: '2026-11-24', plan: { kind: 'recipe', recipeId: 'steak-bbq' } },
      { t: 'check', week: '2026-11-22', key: 'potatoes|g', on: true },
      { t: 'extra', week: '2026-11-22', item: { id: 'x1', text: 'Zip lock', checked: false, at: 1 } },
      { t: 'settings', settings: { weekStartsOn: 0 } },
    ];
    expect((await call('POST', ops)).status).toBe(200);

    const { state, empty } = (await (await call('GET')).json()) as { state: AppState; empty: boolean };
    expect(empty).toBe(false);
    expect(state).toEqual(applyOps(initialState, ops));
  });
});
