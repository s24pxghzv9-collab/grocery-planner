import type { AppState, Op, WeekShopping } from '../types';

function week(state: AppState, start: string): WeekShopping {
  return state.shopping[start] ?? { checked: {}, extras: [] };
}

function withWeek(state: AppState, start: string, fn: (w: WeekShopping) => WeekShopping): AppState {
  return { ...state, shopping: { ...state.shopping, [start]: fn(week(state, start)) } };
}

/** Pure: returns a new state with the op applied. */
export function applyOp(state: AppState, op: Op): AppState {
  switch (op.t) {
    case 'plan': {
      const plans = { ...state.plans };
      if (op.plan) plans[op.date] = op.plan;
      else delete plans[op.date];
      return { ...state, plans };
    }
    case 'check':
      return withWeek(state, op.week, (w) => {
        const checked = { ...w.checked };
        if (op.on) checked[op.key] = true;
        else delete checked[op.key];
        return { ...w, checked };
      });
    case 'extra':
      return withWeek(state, op.week, (w) => {
        const exists = w.extras.some((e) => e.id === op.item.id);
        const extras = exists ? w.extras.map((e) => (e.id === op.item.id ? op.item : e)) : [...w.extras, op.item];
        return { ...w, extras };
      });
    case 'extraDel':
      return withWeek(state, op.week, (w) => ({ ...w, extras: w.extras.filter((e) => e.id !== op.id) }));
    case 'settings':
      return { ...state, settings: op.settings };
    case 'history':
      return { ...state, extrasHistory: op.list };
  }
}

export function applyOps(state: AppState, ops: Op[]): AppState {
  return ops.reduce(applyOp, state);
}

/** Express a whole state as ops, used to upload data entered before sync existed. */
export function stateToOps(state: AppState): Op[] {
  const ops: Op[] = [];
  for (const [date, plan] of Object.entries(state.plans)) ops.push({ t: 'plan', date, plan });
  for (const [w, shop] of Object.entries(state.shopping)) {
    for (const [key, on] of Object.entries(shop.checked)) if (on) ops.push({ t: 'check', week: w, key, on: true });
    for (const item of shop.extras) ops.push({ t: 'extra', week: w, item });
  }
  ops.push({ t: 'settings', settings: state.settings });
  if (state.extrasHistory.length) ops.push({ t: 'history', list: state.extrasHistory });
  return ops;
}

export function hasData(state: AppState): boolean {
  return (
    Object.keys(state.plans).length > 0 ||
    Object.values(state.shopping).some((w) => w.extras.length > 0 || Object.keys(w.checked).length > 0)
  );
}
