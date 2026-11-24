import { addDays, dayName, rangeLabel, shortDate, weekDays, weekLabel, DAY_NAMES } from '../lib/dates';
import { describePlan } from '../lib/plan';
import type { Ctx } from '../App';

export function Plan({ ctx }: { ctx: Ctx }) {
  const { state, update, today, currentWeek, planWeek, setPlanWeek, openPicker, openRecipe, toast } = ctx;
  const days = weekDays(planWeek);
  const planned = days.filter((d) => state.plans[d]).length;
  const prevDays = weekDays(addDays(planWeek, -7));
  const lastWeekHasPlans = prevDays.some((d) => state.plans[d]);

  const fillFromLastWeek = () => {
    const filled = days.filter((d, i) => !state.plans[d] && state.plans[prevDays[i]]).length;
    update((s) => {
      const plans = { ...s.plans };
      days.forEach((d, i) => {
        const prev = s.plans[prevDays[i]];
        if (!plans[d] && prev) plans[d] = prev;
      });
      return { ...s, plans };
    });
    toast(filled ? `Copied ${filled} dinner${filled === 1 ? '' : 's'} from last week` : 'Nothing to copy');
  };

  const clearWeek = () => {
    if (!confirm(`Clear all dinners for ${rangeLabel(planWeek)}?`)) return;
    update((s) => {
      const plans = { ...s.plans };
      days.forEach((d) => delete plans[d]);
      return { ...s, plans };
    });
  };

  const firstEmpty = days.find((d) => !state.plans[d] && d >= today) ?? days.find((d) => !state.plans[d]);

  return (
    <main className="screen">
      <header className="page-header">
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setPlanWeek(addDays(planWeek, -7))} aria-label="Previous week">
            ‹
          </button>
          <div className="week-nav-label">
            <h1>{weekLabel(planWeek, currentWeek)}</h1>
            <p className="muted">
              {rangeLabel(planWeek)} · {planned}/7 planned
            </p>
          </div>
          <button className="icon-btn" onClick={() => setPlanWeek(addDays(planWeek, 7))} aria-label="Next week">
            ›
          </button>
        </div>
      </header>

      {firstEmpty && (
        <button className="btn btn-block btn-lg" onClick={() => openPicker(firstEmpty)}>
          {planned === 0 ? 'Start planning' : 'Fill in the gaps'}
        </button>
      )}

      <ul className="day-list">
        {days.map((d) => {
          const p = describePlan(state.plans[d]);
          return (
            <li key={d} className={`${d === today ? 'is-today' : ''} ${d < today ? 'is-past' : ''}`}>
              <button className="day-row big" onClick={() => openPicker(d)}>
                <span className="day-row-date">
                  <strong>{dayName(d)}</strong>
                  <span className="muted small">{d === today ? 'Today' : shortDate(d)}</span>
                </span>
                <span className={`day-row-meal ${p ? '' : 'muted'}`}>
                  {p ? (
                    <>
                      <span className="emoji">{p.emoji}</span> {p.title}
                    </>
                  ) : (
                    '+ Add dinner'
                  )}
                </span>
              </button>
              {p?.recipe && (
                <button className="icon-btn subtle" onClick={() => openRecipe(p.recipe!.id)} aria-label={`View ${p.title}`}>
                  ⓘ
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="btn-row center">
        {lastWeekHasPlans && planned < 7 && (
          <button className="btn btn-ghost" onClick={fillFromLastWeek}>
            Copy last week
          </button>
        )}
        {planned > 0 && (
          <button className="btn btn-ghost danger" onClick={clearWeek}>
            Clear week
          </button>
        )}
      </div>

      <label className="setting">
        <span className="muted small">Weeks start on</span>
        <select
          value={state.settings.weekStartsOn}
          onChange={(e) => {
            const weekStartsOn = Number(e.target.value);
            update((s) => ({ ...s, settings: { ...s.settings, weekStartsOn } }));
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
