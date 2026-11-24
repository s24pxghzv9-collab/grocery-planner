import { ArrowRight, ChevronRight, ShoppingBasket } from 'lucide-react';
import { addDays, dayName, dayNum, dayShort, fromISO, rangeLabel, shortDate, weekDays } from '../lib/dates';
import { describePlan, recipeMeta } from '../lib/plan';
import { Marker } from '../components/Marker';
import { SyncBadge } from '../components/SyncBadge';
import type { Ctx } from '../App';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Home({ ctx }: { ctx: Ctx }) {
  const { state, today, currentWeek, openPicker, openRecipe, goPlan, goList, listSummary } = ctx;
  const days = weekDays(currentWeek);
  const tonight = describePlan(state.plans[today]);
  const nextWeek = addDays(currentWeek, 7);
  const nextDays = weekDays(nextWeek);
  const nextPlanned = nextDays.filter((d) => state.plans[d]).length;
  const t = fromISO(today);

  return (
    <main className="screen home">
      <header className="masthead">
        <div className="masthead-top">
          <p className="kicker">Week of {shortDate(currentWeek)}</p>
          <SyncBadge status={ctx.syncStatus} />
        </div>
        <h1 className="display">{dayName(today)}</h1>
        <p className="masthead-date">
          {t.getDate()} {MONTHS[t.getMonth()]}
        </p>
      </header>

      <section className="tonight" aria-label="Tonight's dinner">
        <p className="kicker">Tonight</p>
        {tonight ? (
          <>
            <h2 className="tonight-dish">{tonight.title}</h2>
            {tonight.recipe && <p className="tonight-meta">{recipeMeta(tonight.recipe, { serves: true })}</p>}
            <div className="tonight-actions">
              {tonight.recipe && (
                <button className="btn btn-inverse" onClick={() => openRecipe(tonight.recipe!.id)}>
                  View recipe
                </button>
              )}
              <button className="btn btn-text-inverse" onClick={() => openPicker(today)}>
                Swap
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="tonight-dish tonight-empty">Nothing planned yet</h2>
            <div className="tonight-actions">
              <button className="btn btn-inverse" onClick={() => openPicker(today)}>
                Choose a dinner
              </button>
            </div>
          </>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-label">This week</h2>
          <button className="link" onClick={() => goPlan(currentWeek)}>
            Edit
          </button>
        </div>
        <ol className="menu">
          {days.map((d) => {
            const p = describePlan(state.plans[d]);
            const isToday = d === today;
            const isPast = d < today;
            return (
              <li key={d} className={`${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}>
                <button className="menu-row" onClick={() => openPicker(d)}>
                  <span className="menu-day">
                    <span className="menu-day-name">{dayShort(d)}</span>
                    <span className="menu-day-num">{dayNum(d)}</span>
                  </span>
                  <span className={`menu-dish ${p ? '' : 'is-empty'}`}>{p ? p.title : isPast ? '—' : 'Add dinner'}</span>
                  {isToday ? <span className="today-tag">Today</span> : isPast && !p ? <span /> : <Marker plan={p} />}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="next-week">
        <div className="section-head">
          <h2 className="section-label">Next week</h2>
          <span className="muted small">{rangeLabel(nextWeek)}</span>
        </div>
        <div className="ticks" aria-label={`${nextPlanned} of 7 dinners planned`}>
          {nextDays.map((d) => (
            <span key={d} className={state.plans[d] ? 'on' : ''}>
              <i />
              {dayShort(d)[0]}
            </span>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => goPlan(nextWeek)}>
          {nextPlanned === 0 ? 'Plan next week' : nextPlanned === 7 ? 'Review next week' : `Continue planning · ${nextPlanned}/7`}
          <ArrowRight size={18} />
        </button>
      </section>

      <button className="row-link" onClick={goList}>
        <ShoppingBasket size={22} strokeWidth={1.75} />
        <span className="row-link-text">
          <strong>Shopping list</strong>
          <span className="muted small">
            {listSummary.remaining === 0 ? 'Nothing to buy' : `${listSummary.remaining} to buy`} · {listSummary.label.toLowerCase()}
          </span>
        </span>
        <ChevronRight size={20} className="muted" />
      </button>
    </main>
  );
}
