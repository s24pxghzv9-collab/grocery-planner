import { useCallback, useEffect, useState } from 'react';
import type { AppState, WeekShopping } from '../types';

const STORAGE_KEY = 'dinner-planner:v1';

export const initialState: AppState = {
  version: 1,
  plans: {},
  shopping: {},
  extrasHistory: [],
  settings: { weekStartsOn: 0 },
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initialState,
      ...parsed,
      settings: { ...initialState.settings, ...parsed.settings },
    };
  } catch {
    return initialState;
  }
}

export type Update = (fn: (s: AppState) => AppState) => void;

/** App state saved to this browser's localStorage. */
export function useAppState(): [AppState, Update] {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable (private mode). The app still works for this visit.
    }
  }, [state]);

  const update = useCallback<Update>((fn) => setState((s) => fn(s)), []);
  return [state, update];
}

export function weekShopping(state: AppState, start: string): WeekShopping {
  return state.shopping[start] ?? { checked: {}, extras: [] };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
