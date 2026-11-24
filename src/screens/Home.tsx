import { ArrowRight, ChevronRight, ShoppingBasket } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { addDays, dayName, dayNum, dayShort, fromISO, rangeLabel, shortDate, weekDays, weekStart } from '../lib/dates';
import { describePlan, recipeMeta } from '../lib/plan';
import { Marker } from '../components/Marker';
import { SyncBadge } from '../components/SyncBadge';
import type { Ctx } from '../App';

const HISTORY_START_DAYS = 14;
const HISTORY_STEP_DAYS = 28;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Home({ ctx }: { ctx: Ctx }) {
  const { state, today, currentWeek, openPicker, openRecipe, goPlan, goList, listSummary } = ctx;
  // Rolling: today first, then the next six days (runs into next week when needed).
  const upcoming = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [historyDays, setHistoryDays] = useState(HISTORY_START_DAYS);
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
          <h2 className="section-label">Coming up</h2>
          <button className="link" onClick={() => goPlan(currentWeek)}>
            Edit
          </button>
        </div>
        <ol className="menu">
          {upcoming.map((d, i) => {
            const p = describePlan(state.plans[d]);
            const isToday = d === today;
            return (
              <MenuItem key={d} divider={i > 0 && d === nextWeek ? 'Next week' : undefined} className={isToday ? 'is-today' : ''}>
                <button className="menu-row" onClick={() => openPicker(d)}>
                  <span className="menu-day">
                    <span className="menu-day-name">{dayShort(d)}</span>
                    <span className="menu-day-num">{dayNum(d)}</span>
                  </span>
                  <span className={`menu-dish ${p ? '' : 'is-empty'}`}>{p ? p.title : 'Add dinner'}</span>
                  {isToday ? <span className="today-tag">Today</span> : <Marker plan={p} />}
                </button>
              </MenuItem>
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

      <History
        ctx={ctx}
        days={historyDays}
        onMore={() => setHistoryDays((n) => n + HISTORY_STEP_DAYS)}
      />
    </main>
  );
}

function MenuItem({ divider, className, children }: { divider?: string; className?: string; children: ReactNode }) {
  return (
    <>
      {divider && (
        <li className="menu-divider" aria-hidden>
          {divider}
        </li>
      )}
      <li className={className}>{children}</li>
    </>
  );
}

/** Past dinners, most recent first, grouped by week. Scroll down to go back in time. */
function History({ ctx, days, onMore }: { ctx: Ctx; days: number; onMore: () => void }) {
  const { state, today, openRecipe } = ctx;
  const pastDates = Object.keys(state.plans)
    .filter((d) => d < today)
    .sort()
    .reverse();
  if (pastDates.length === 0) return null;

  const cutoff = addDays(today, -days);
  const shown = pastDates.filter((d) => d >= cutoff);
  const hasMore = pastDates.some((d) => d < cutoff);

  const groups: { week: string; dates: string[] }[] = [];
  for (const d of shown) {
    const w = weekStart(d, state.settings.weekStartsOn);
    const last = groups[groups.length - 1];
    if (last?.week === w) last.dates.push(d);
    else groups.push({ week: w, dates: [d] });
  }

  return (
    <section className="history" aria-label="Earlier dinners">
      <div className="section-head">
        <h2 className="section-label">Earlier</h2>
      </div>
      {groups.length === 0 && <p className="muted small">Nothing in the last {days} days.</p>}
      {groups.map(({ week, dates }) => (
        <div key={week} className="history-week">
          <p className="history-week-label">Week of {shortDate(week)}</p>
          <ol className="menu">
            {dates.map((d) => {
              const p = describePlan(state.plans[d]);
              const recipe = p?.recipe;
              const row = (
                <>
                  <span className="menu-day">
                    <span className="menu-day-name">{dayShort(d)}</span>
                    <span className="menu-day-num">{dayNum(d)}</span>
                  </span>
                  <span className="menu-dish">{p?.title}</span>
                  <Marker plan={p} />
                </>
              );
              return (
                <li key={d}>
                  {recipe ? (
                    <button className="menu-row" onClick={() => openRecipe(recipe.id)}>
                      {row}
                    </button>
                  ) : (
                    <div className="menu-row">{row}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {hasMore && (
        <div className="quiet-actions">
          <button className="link" onClick={onMore}>
            Show earlier
          </button>
        </div>
      )}
    </section>
  );
}
