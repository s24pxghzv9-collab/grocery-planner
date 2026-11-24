/*
 * Server side of household sync. The household is stored in four Redis hashes, one
 * field per day / ticked item / extra, so two phones editing at the same time merge
 * at field level instead of overwriting each other.
 *
 * Files in api/_lib are not deployed as endpoints (underscore prefix).
 */
import type { AppState, DayPlan, ExtraItem, Op, Recipe } from '../../src/types';

// Distinct prefix so this can safely share a Redis database with other apps.
const PREFIX = 'dinner-planner:';
export const KEYS = {
  plans: `${PREFIX}plans`, // date -> DayPlan json
  checked: `${PREFIX}checked`, // `${week}|${itemKey}` -> '1'
  extras: `${PREFIX}extras`, // id -> { week, ...ExtraItem } json
  meta: `${PREFIX}meta`, // 'settings' | 'history' -> json
  recipes: `${PREFIX}recipes`, // id -> Recipe json (added or edited in the app)
} as const;

export interface Write {
  key: string;
  set?: Record<string, string>;
  del?: string[];
}

/** Minimal storage interface so the handler can run on Upstash or in memory. */
export interface Store {
  readAll(keys: string[]): Promise<Record<string, string>[]>;
  write(writes: Write[]): Promise<void>;
}

// ---------- Validation (anyone with the link can call the API) ----------

const MAX_OPS = 1000;
const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function validPlan(p: unknown): p is DayPlan | null {
  if (p === null) return true;
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (o.kind === 'recipe' && isStr(o.recipeId)) || (o.kind === 'note' && isStr(o.text));
}

function validItem(i: unknown): i is ExtraItem {
  if (!i || typeof i !== 'object') return false;
  const o = i as Record<string, unknown>;
  return isStr(o.id, 40) && isStr(o.text) && typeof o.checked === 'boolean' && (o.at === undefined || typeof o.at === 'number');
}

const AISLES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices & Sauces', 'Frozen', 'Other'];
const CATEGORIES = ['Beef', 'Lamb', 'Pork', 'Chicken', 'Seafood', 'Vegetarian', 'Other'];
const optStr = (v: unknown, max: number) => v === undefined || (typeof v === 'string' && v.length <= max);
const optNum = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 100000);

function validRecipe(r: unknown): r is Recipe {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (!isStr(o.id, 80) || !/^[a-z0-9-]+$/.test(o.id as string)) return false;
  if (o.deleted === true) return true; // tombstone: only the id matters
  const src = o.source as Record<string, unknown> | undefined;
  return (
    isStr(o.name, 150) &&
    CATEGORIES.includes(o.category as string) &&
    Array.isArray(o.tags) && o.tags.length <= 12 && o.tags.every((t) => isStr(t, 40)) &&
    optNum(o.serves) && optNum(o.minutes) &&
    (o.addedAt === undefined || (typeof o.addedAt === 'number' && Number.isFinite(o.addedAt) && o.addedAt > 0)) &&
    Array.isArray(o.ingredients) && o.ingredients.length <= 80 &&
    o.ingredients.every((i) => {
      if (!i || typeof i !== 'object') return false;
      const x = i as Record<string, unknown>;
      return isStr(x.name, 120) && AISLES.includes(x.aisle as string) && optNum(x.qty) && optStr(x.unit, 20) &&
        (x.staple === undefined || typeof x.staple === 'boolean');
    }) &&
    (o.method === undefined || (Array.isArray(o.method) && o.method.length <= 60 && o.method.every((m) => isStr(m, 3000)))) &&
    optStr(o.notes, 3000) && optStr(o.author, 150) &&
    (o.image === undefined ||
      (typeof o.image === 'string' &&
        ((o.image.length <= 2500 && /^(https:\/\/|\/recipe-photos\/)/.test(o.image)) ||
          (o.image.length <= 250_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(o.image))))) &&
    (src === undefined || (!!src && isStr(src.name, 100) && optStr(src.url, 2500)))
  );
}

export function validateOps(input: unknown): Op[] | null {
  if (!Array.isArray(input) || input.length > MAX_OPS) return null;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const op = raw as Record<string, unknown>;
    const ok =
      (op.t === 'plan' && isDate(op.date) && validPlan(op.plan)) ||
      (op.t === 'check' && isDate(op.week) && isStr(op.key, 300) && typeof op.on === 'boolean') ||
      (op.t === 'extra' && isDate(op.week) && validItem(op.item)) ||
      (op.t === 'extraDel' && isDate(op.week) && isStr(op.id, 40)) ||
      (op.t === 'settings' &&
        !!op.settings &&
        typeof (op.settings as { weekStartsOn?: unknown }).weekStartsOn === 'number') ||
      (op.t === 'history' && Array.isArray(op.list) && op.list.length <= 50 && op.list.every((s) => isStr(s))) ||
      (op.t === 'recipe' && validRecipe(op.recipe));
    if (!ok) return null;
  }
  return input as Op[];
}

// ---------- Ops -> Redis writes ----------

export function opsToWrites(ops: Op[]): Write[] {
  return ops.map((op): Write => {
    switch (op.t) {
      case 'plan':
        return op.plan ? { key: KEYS.plans, set: { [op.date]: JSON.stringify(op.plan) } } : { key: KEYS.plans, del: [op.date] };
      case 'check': {
        const field = `${op.week}|${op.key}`;
        return op.on ? { key: KEYS.checked, set: { [field]: '1' } } : { key: KEYS.checked, del: [field] };
      }
      case 'extra':
        return { key: KEYS.extras, set: { [op.item.id]: JSON.stringify({ ...op.item, week: op.week }) } };
      case 'extraDel':
        return { key: KEYS.extras, del: [op.id] };
      case 'settings':
        return { key: KEYS.meta, set: { settings: JSON.stringify({ weekStartsOn: op.settings.weekStartsOn }) } };
      case 'history':
        return { key: KEYS.meta, set: { history: JSON.stringify(op.list) } };
      case 'recipe':
        return { key: KEYS.recipes, set: { [op.recipe.id]: JSON.stringify(op.recipe) } };
    }
  });
}

// ---------- Redis hashes -> AppState ----------

function parse<T>(s: string | undefined, fallback: T): T {
  if (s == null) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function hashesToState([plans, checked, extras, meta, recipes]: Record<string, string>[]): {
  state: AppState;
  empty: boolean;
} {
  const state: AppState = {
    version: 1,
    plans: {},
    shopping: {},
    recipes: {},
    extrasHistory: parse(meta?.history, [] as string[]),
    settings: parse(meta?.settings, { weekStartsOn: 0 }),
  };
  const weekOf = (w: string) => (state.shopping[w] ??= { checked: {}, extras: [] });

  for (const [date, json] of Object.entries(plans ?? {})) {
    const plan = parse<DayPlan | null>(json, null);
    if (plan) state.plans[date] = plan;
  }
  for (const field of Object.keys(checked ?? {})) {
    const i = field.indexOf('|');
    if (i > 0) weekOf(field.slice(0, i)).checked[field.slice(i + 1)] = true;
  }
  for (const json of Object.values(extras ?? {})) {
    const e = parse<(ExtraItem & { week: string }) | null>(json, null);
    if (!e?.week) continue;
    const { week, ...item } = e;
    weekOf(week).extras.push(item);
  }
  for (const json of Object.values(recipes ?? {})) {
    const r = parse<Recipe | null>(json, null);
    if (r?.id) state.recipes[r.id] = r;
  }
  for (const w of Object.values(state.shopping)) w.extras.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  const empty = [plans, checked, extras, meta, recipes].every((h) => !h || Object.keys(h).length === 0);
  return { state, empty };
}

// ---------- HTTP handler (Web Request/Response) ----------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function handle(request: Request, store: Store | null): Promise<Response> {
  if (!store) return json({ error: 'not-configured' }, 503);
  const order = [KEYS.plans, KEYS.checked, KEYS.extras, KEYS.meta, KEYS.recipes];

  if (request.method === 'GET') {
    return json(hashesToState(await store.readAll(order)));
  }

  if (request.method === 'POST') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad-json' }, 400);
    }
    const ops = validateOps((body as { ops?: unknown })?.ops);
    if (!ops) return json({ error: 'bad-ops' }, 400);
    if (ops.length) await store.write(opsToWrites(ops));
    return json({ ok: true, applied: ops.length });
  }

  return json({ error: 'method-not-allowed' }, 405);
}

// ---------- In-memory store for local development and tests ----------

export function memoryStore(): Store {
  const data = new Map<string, Map<string, string>>();
  return {
    async readAll(keys) {
      return keys.map((k) => Object.fromEntries(data.get(k) ?? []));
    },
    async write(writes) {
      for (const w of writes) {
        const h = data.get(w.key) ?? new Map<string, string>();
        for (const [f, v] of Object.entries(w.set ?? {})) h.set(f, v);
        for (const f of w.del ?? []) h.delete(f);
        data.set(w.key, h);
      }
    },
  };
}
