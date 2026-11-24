import { addDays, dayName, dayNum, dayShort, rangeLabel, shortDate, weekDays } from '../lib/dates';
import { describePlan } from '../lib/plan';
import type { Ctx } from '../App';

export function Home({ ctx }: { ctx: Ctx }) {
  const { state, today, currentWeek, openPicker, openRecipe, goPlan, goList, listSummary } = ctx;
  const days = weekDays(currentWeek);
  const tonight = describePlan(state.plans[today]);
  const nextWeek = addDays(currentWeek, 7);
  const nextDays = weekDays(nextWeek);
  const nextPlanned = nextDays.filter((d) => state.plans[d]).length;
  const rest = days.filter((d) => d > today);

  return (
    <main className="screen">
      <header className="page-header">
        <p className="eyebrow">
          {dayName(today)} {shortDate(today)}
        </p>
        <h1>What's for dinner</h1>
      </header>

      <div className="week-strip" aria-label={`This week, ${rangeLabel(currentWeek)}`}>
        {days.map((d) => {
          const p = describePlan(state.plans[d]);
          return (
            <button
              key={d}
              className={`day-pill ${d === today ? 'today' : ''} ${d < today ? 'past' : ''}`}
              onClick={() => openPicker(d)}
              aria-label={`${dayName(d)}: ${p?.title ?? 'nothing planned'}`}
            >
              <span className="day-pill-name">{dayShort(d)}</span>
              <span className="day-pill-num">{dayNum(d)}</span>
              <span className="day-pill-emoji">{p?.emoji ?? '·'}</span>
            </button>
          );
        })}
      </div>

      <section className="card tonight">
        <p className="eyebrow">Tonight</p>
        {tonight ? (
          <>
            <h2 className="tonight-title">
              <span className="emoji-lg">{tonight.emoji}</span> {tonight.title}
            </h2>
            {tonight.recipe?.minutes && <p className="muted">{tonight.recipe.minutes} minutes</p>}
            <div className="btn-row">
              {tonight.recipe && (
                <button className="btn" onClick={() => openRecipe(tonight.recipe!.id)}>
                  View recipe
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => openPicker(today)}>
                Change
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="tonight-title muted">Nothing planned yet</h2>
            <button className="btn" onClick={() => openPicker(today)}>
              Pick tonight's dinner
            </button>
          </>
        )}
      </section>

      {rest.length > 0 && (
        <section className="card">
          <p className="eyebrow">Rest of the week</p>
          <ul className="day-list compact">
            {rest.map((d) => {
              const p = describePlan(state.plans[d]);
              return (
                <li key={d}>
                  <button className="day-row" onClick={() => openPicker(d)}>
                    <span className="day-row-name">{dayName(d)}</span>
                    <span className={`day-row-meal ${p ? '' : 'muted'}`}>
                      {p ? `${p.emoji} ${p.title}` : 'Tap to plan'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card next-week">
        <div>
          <p className="eyebrow">Next week · {rangeLabel(nextWeek)}</p>
          <p className="big-stat">
            {nextPlanned} <span className="muted">of 7 dinners planned</span>
          </p>
          <div className="progress">
            <div style={{ width: `${(nextPlanned / 7) * 100}%` }} />
          </div>
        </div>
        <button className="btn btn-block" onClick={() => goPlan(nextWeek)}>
          {nextPlanned === 0 ? 'Plan next week' : 'Keep planning'}
        </button>
      </section>

      <button className="card card-link" onClick={goList}>
        <span>
          <p className="eyebrow">Shopping list · {listSummary.label}</p>
          <p className="big-stat">
            {listSummary.remaining} <span className="muted">items to get</span>
          </p>
        </span>
        <span className="chevron">›</span>
      </button>
    </main>
  );
}
