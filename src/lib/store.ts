import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Op, WeekShopping } from '../types';
import { applyOps, hasData, stateToOps } from './ops';

/*
 * Household state, shared between phones.
 *
 * - `base` is the last state received from the server (cached in localStorage so the
 *   app opens instantly and works offline).
 * - `pending` is a queue of edits made on this phone that the server hasn't confirmed.
 * - What you see is base + pending, so your own edits show immediately and survive
 *   being offline (e.g. ticking things off in a supermarket with bad signal).
 *
 * If the server has no database configured, the app runs in "local" mode: edits are
 * saved on this phone only, exactly like before sync existed.
 */

const BASE_KEY = 'dinner-planner:v1';
const QUEUE_KEY = 'dinner-planner:queue';
const META_KEY = 'dinner-planner:sync';
const API = '/api/household';
const POLL_MS = 15_000;

export const initialState: AppState = {
  version: 1,
  plans: {},
  shopping: {},
  recipes: {},
  alwaysHave: {},
  extrasHistory: [],
  settings: { weekStartsOn: 0 },
};

export type SyncStatus = 'connecting' | 'synced' | 'saving' | 'offline' | 'local';

interface SyncMeta {
  /** Data on this phone that has never been uploaded (entered before sync, or while in local mode). */
  localOnly: boolean;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private browsing). The app still works for this visit.
  }
}

function normalise(s: Partial<AppState>): AppState {
  return { ...initialState, ...s, recipes: s.recipes ?? {}, alwaysHave: s.alwaysHave ?? {}, settings: { ...initialState.settings, ...s.settings } };
}

export type Dispatch = (ops: Op | Op[]) => void;

export function useHouseholdState(): { state: AppState; dispatch: Dispatch; status: SyncStatus } {
  const [base, setBase] = useState<AppState>(() => normalise(read(BASE_KEY, {})));
  const [pending, setPending] = useState<Op[]>(() => read(QUEUE_KEY, []));
  const [status, setStatus] = useState<SyncStatus>('connecting');

  // Refs so async callbacks always see the latest values.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const baseRef = useRef(base);
  baseRef.current = base;
  const meta = useRef<SyncMeta>(
    read<SyncMeta | null>(META_KEY, null) ?? { localOnly: localStorage.getItem(BASE_KEY) != null },
  );
  const mode = useRef<'unknown' | 'remote' | 'local'>('unknown');
  const inFlight = useRef(false);
  const flushSeq = useRef(0);
  const flushTimer = useRef<number | undefined>(undefined);

  useEffect(() => write(BASE_KEY, base), [base]);
  useEffect(() => write(QUEUE_KEY, pending), [pending]);
  const setMeta = (m: SyncMeta) => {
    meta.current = m;
    write(META_KEY, m);
  };

  /** Server has no database: keep everything on this phone. */
  const goLocal = useCallback(() => {
    mode.current = 'local';
    setStatus('local');
    const queued = pendingRef.current;
    if (queued.length) {
      setBase((b) => applyOps(b, queued));
      setPending([]);
      pendingRef.current = [];
    }
    setMeta({ localOnly: true });
  }, []);

  const flush = useCallback(async () => {
    if (mode.current !== 'remote' || inFlight.current) return;
    const batch = pendingRef.current;
    if (!batch.length) return;
    inFlight.current = true;
    setStatus('saving');
    let sent = false;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ops: batch }),
      });
      if (res.status === 503) return goLocal();
      if (res.status === 400) {
        // The server will never accept these; drop them rather than retrying forever.
        console.warn('Sync rejected a batch of edits', await res.text());
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      sent = true;
      flushSeq.current++;
      setBase((b) => applyOps(b, batch));
      setPending((p) => p.slice(batch.length));
      pendingRef.current = pendingRef.current.slice(batch.length);
      setStatus(pendingRef.current.length ? 'saving' : 'synced');
    } catch {
      setStatus('offline');
    } finally {
      inFlight.current = false;
      // More edits may have arrived while this batch was sending.
      if (sent && mode.current === 'remote' && pendingRef.current.length) {
        window.setTimeout(() => void flush(), 50);
      }
    }
  }, [goLocal]);

  const pull = useCallback(async () => {
    const seq = flushSeq.current;
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (res.status === 503) return goLocal();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { state: AppState; empty: boolean };
      mode.current = 'remote';

      // Data entered on this phone before sync was switched on: upload it once.
      if (meta.current.localOnly) {
        const toUpload = body.empty && hasData(baseRef.current) ? stateToOps(baseRef.current) : [];
        setMeta({ localOnly: false });
        if (toUpload.length) {
          setPending((p) => {
            const next = [...toUpload, ...p];
            pendingRef.current = next;
            return next;
          });
          void flush();
          return;
        }
      }

      // A batch was confirmed while this request was in the air, so this snapshot may
      // be missing it. Skip it; the next pull will be up to date.
      if (seq !== flushSeq.current) return;

      const next = normalise(body.state);
      if (JSON.stringify(next) !== JSON.stringify(baseRef.current)) setBase(next);
      if (pendingRef.current.length) void flush();
      else setStatus('synced');
    } catch {
      if (mode.current !== 'local') setStatus('offline');
    }
  }, [goLocal, flush]);

  // Pull on open, when the app comes back to the foreground, when the network returns,
  // and every few seconds while it's on screen.
  useEffect(() => {
    void pull();
    const onVisible = () => document.visibilityState === 'visible' && void pull();
    const onOnline = () => void pull();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && mode.current !== 'local') void pull();
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      clearInterval(id);
    };
  }, [pull]);

  const dispatch = useCallback<Dispatch>(
    (input) => {
      const ops = Array.isArray(input) ? input : [input];
      if (!ops.length) return;
      if (mode.current === 'local') {
        setBase((b) => applyOps(b, ops));
        return;
      }
      setPending((p) => {
        const next = [...p, ...ops];
        pendingRef.current = next;
        return next;
      });
      // Batch quick successive taps into one request.
      clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => void flush(), 300);
    },
    [flush],
  );

  const state = useMemo(() => applyOps(base, pending), [base, pending]);
  return { state, dispatch, status };
}

export function weekShopping(state: AppState, start: string): WeekShopping {
  return state.shopping[start] ?? { checked: {}, extras: [] };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
