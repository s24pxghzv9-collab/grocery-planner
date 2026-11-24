import { describe, expect, it } from 'vitest';
import { applyOps, stateToOps } from '../../src/lib/ops';
import { initialState } from '../../src/lib/store';
import type { AppState, Op } from '../../src/types';
import { handle, memoryStore, validateOps } from './household';

const W = '2026-11-22';

async function post(store: ReturnType<typeof memoryStore>, ops: unknown) {
  return handle(
    new Request('http://x/api/household', { method: 'POST', body: JSON.stringify({ ops }), headers: { 'content-type': 'application/json' } }),
    store,
  );
}
async function get(store: ReturnType<typeof memoryStore>) {
  const res = await handle(new Request('http://x/api/household'), store);
  return (await res.json()) as { state: AppState; empty: boolean };
}

const sample: Op[] = [
  { t: 'plan', date: '2026-11-24', plan: { kind: 'recipe', recipeId: 'prawn-stirfry' } },
  { t: 'plan', date: '2026-11-25', plan: { kind: 'note', text: "Liz's party" } },
  { t: 'check', week: W, key: 'potatoes|g', on: true },
  { t: 'extra', week: W, item: { id: 'a1', text: 'Zip lock', checked: false, at: 1 } },
  { t: 'extra', week: W, item: { id: 'a2', text: 'Coffee beans', checked: true, at: 2 } },
  { t: 'history', list: ['Coffee beans', 'Zip lock'] },
  { t: 'settings', settings: { weekStartsOn: 1 } },
];

describe('household sync API', () => {
  it('returns the same state the phone computed locally', async () => {
    const store = memoryStore();
    expect((await get(store)).empty).toBe(true);
    expect((await post(store, sample)).status).toBe(200);
    const { state, empty } = await get(store);
    expect(empty).toBe(false);
    expect(state).toEqual(applyOps(initialState, sample));
  });

  it('merges edits from two phones instead of overwriting', async () => {
    const store = memoryStore();
    // Alice plans Tuesday while Reece ticks off potatoes and plans Wednesday.
    await post(store, [{ t: 'plan', date: '2026-11-24', plan: { kind: 'recipe', recipeId: 'a' } }]);
    await post(store, [
      { t: 'check', week: W, key: 'potatoes|g', on: true },
      { t: 'plan', date: '2026-11-25', plan: { kind: 'recipe', recipeId: 'b' } },
    ]);
    const { state } = await get(store);
    expect(Object.keys(state.plans).sort()).toEqual(['2026-11-24', '2026-11-25']);
    expect(state.shopping[W].checked['potatoes|g']).toBe(true);
  });

  it('handles removals', async () => {
    const store = memoryStore();
    await post(store, sample);
    await post(store, [
      { t: 'plan', date: '2026-11-24', plan: null },
      { t: 'check', week: W, key: 'potatoes|g', on: false },
      { t: 'extraDel', week: W, id: 'a1' },
    ]);
    const { state } = await get(store);
    expect(state.plans['2026-11-24']).toBeUndefined();
    expect(state.shopping[W].checked).toEqual({});
    expect(state.shopping[W].extras.map((e) => e.id)).toEqual(['a2']);
  });

  it('round-trips a whole local state (first upload after sync is switched on)', async () => {
    const store = memoryStore();
    const local = applyOps(initialState, sample);
    await post(store, stateToOps(local));
    expect((await get(store)).state).toEqual(local);
  });

  it('rejects malformed edits', async () => {
    const store = memoryStore();
    expect((await post(store, [{ t: 'plan', date: 'not-a-date', plan: null }])).status).toBe(400);
    expect((await post(store, [{ t: 'nope' }])).status).toBe(400);
    expect(validateOps('x')).toBeNull();
    expect((await get(store)).empty).toBe(true);
  });

  it('reports when no database is configured', async () => {
    expect((await handle(new Request('http://x/api/household'), null)).status).toBe(503);
  });
});
