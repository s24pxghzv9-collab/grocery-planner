import { ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { addDays, dayName, rangeLabel, shortDate, weekDays, weekLabel, DAY_NAMES } from '../lib/dates';
import { describePlan } from '../lib/plan';
import { Marker } from '../components/Marker';
import type { Ctx } from '../App';

export function Plan({ ctx }: { ctx: Ctx }) {
  const { state, dispatch, today, currentWeek, planWeek, setPlanWeek, openPicker, toast } = ctx;
  const days = weekDays(planWeek);
  const planned = days.filter((d) => state.plans[d]).length;
  const prevDays = weekDays(addDays(planWeek, -7));
  const lastWeekHasPlans = prevDays.some((d) => state.plans[d]);

  const fillFromLastWeek = () => {
    const filled = days.filter((d, i) => !state.plans[d] && state.plans[prevDays[i]]).length;
    dispatch(
      days.flatMap((d, i) => {
        const prev = state.plans[prevDays[i]];
        return !state.plans[d] && prev ? [{ t: 'plan' as const, date: d, plan: prev }] : [];
      }),
    );
    toast(filled ? `Copied ${filled} dinner${filled === 1 ? '' : 's'} from last week` : 'Nothing to copy');
  };

  const clearWeek = () => {
    if (!confirm(`Clear all dinners for ${rangeLabel(planWeek)}?`)) return;
    dispatch(days.filter((d) => state.plans[d]).map((d) => ({ t: 'plan' as const, date: d, plan: null })));
  };

  const firstEmpty = days.find((d) => !state.plans[d] && d >= today) ?? days.find((d) => !state.plans[d]);

  return (
    <main className="screen">
      <header className="week-nav">
        <button className="icon-btn" onClick={() => setPlanWeek(addDays(planWeek, -7))} aria-label="Previous week">
          <ChevronLeft size={22} />
        </button>
        <div className="week-nav-label">
          <h1 className="title">{weekLabel(planWeek, currentWeek)}</h1>
          <p className="muted small">{rangeLabel(planWeek)}</p>
        </div>
        <button className="icon-btn" onClick={() => setPlanWeek(addDays(planWeek, 7))} aria-label="Next week">
          <ChevronRight size={22} />
        </button>
      </header>

      <div className="plan-progress">
        <div className="bar">
          <div style={{ width: `${(planned / 7) * 100}%` }} />
        </div>
        <span className="small muted">{planned} of 7 planned</span>
      </div>

      <ol className="menu menu-lg">
        {days.map((d) => {
          const p = describePlan(state.plans[d]);
          return (
            <li key={d} className={`${d === today ? 'is-today' : ''} ${d < today ? 'is-past' : ''}`}>
              <button className="menu-row" onClick={() => openPicker(d)}>
                <span className="menu-day wide">
                  <span className="menu-day-name">{dayName(d)}</span>
                  <span className="menu-day-sub">{d === today ? 'Today' : shortDate(d)}</span>
                </span>
                <span className="menu-dish-wrap">
                  <span className={`menu-dish ${p ? '' : 'is-empty'}`}>{p ? p.title : 'Add dinner'}</span>
                  {p?.recipe && <span className="menu-sub">{p.recipe.category}{p.recipe.minutes ? ` · ${p.recipe.minutes} min` : ''}</span>}
                </span>
                <Marker plan={p} />
              </button>
            </li>
          );
        })}
      </ol>

      {firstEmpty && (
        <button className="btn btn-primary btn-block" onClick={() => openPicker(firstEmpty)}>
          {planned === 0 ? 'Start planning' : 'Fill the empty days'}
        </button>
      )}

      <div className="quiet-actions">
        {lastWeekHasPlans && planned < 7 && (
          <button className="link" onClick={fillFromLastWeek}>
            <Copy size={15} /> Copy last week
          </button>
        )}
        {planned > 0 && (
          <button className="link danger" onClick={clearWeek}>
            <Trash2 size={15} /> Clear week
          </button>
        )}
      </div>

      <label className="setting">
        <span>Weeks start on</span>
        <select
          value={state.settings.weekStartsOn}
          onChange={(e) => {
            const weekStartsOn = Number(e.target.value);
            dispatch({ t: 'settings', settings: { ...state.settings, weekStartsOn } });
          }}
        >
          {DAY_NAMES.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </main>
  );
}
