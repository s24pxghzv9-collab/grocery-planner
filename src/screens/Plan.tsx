import { ChevronLeft, ChevronRight, Copy, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { addDays, dayName, dayNum, dayShort, rangeLabel, shortDate, weekDays, weekLabel, DAY_NAMES } from '../lib/dates';
import { describePlan, formatMinutes } from '../lib/plan';
import { Marker, catClass } from '../components/Marker';
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

  const removeDinner = (d: string) => {
    const was = state.plans[d];
    if (!was) return;
    dispatch({ t: 'plan', date: d, plan: null });
    toast(`${dayName(d)} cleared`, { label: 'Undo', run: () => dispatch({ t: 'plan', date: d, plan: was }) });
  };

  /*
   * Drag a dinner by its handle onto another day. The two days swap, so nothing else in
   * the week moves (a note like "Liz's party" stays on its date).
   */
  const list = useRef<HTMLOListElement>(null);
  const dragStart = useRef<{ y: number; rects: DOMRect[] } | null>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number; over: number } | null>(null);

  const onGripDown = (e: ReactPointerEvent<HTMLButtonElement>, from: number) => {
    if (!list.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, rects: [...list.current.children].map((li) => li.getBoundingClientRect()) };
    setDrag({ from, dy: 0, over: from });
  };
  const onGripMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    if (!start || !drag) return;
    const dy = e.clientY - start.y;
    const r = start.rects[drag.from];
    const centre = r.top + r.height / 2 + dy;
    let over = start.rects.findIndex((x) => centre >= x.top && centre < x.bottom);
    if (over < 0) over = centre < start.rects[0].top ? 0 : start.rects.length - 1;
    setDrag({ ...drag, dy, over });
  };
  const onGripUp = () => {
    const d = drag;
    dragStart.current = null;
    setDrag(null);
    if (!d || d.over === d.from) return;
    const a = days[d.from];
    const b = days[d.over];
    const planA = state.plans[a] ?? null;
    const planB = state.plans[b] ?? null;
    dispatch([
      { t: 'plan', date: b, plan: planA },
      { t: 'plan', date: a, plan: planB },
    ]);
    const title = describePlan(planA ?? undefined)?.title ?? 'Dinner';
    toast(`${title} moved to ${dayName(b)}`, {
      label: 'Undo',
      run: () =>
        dispatch([
          { t: 'plan', date: a, plan: planA },
          { t: 'plan', date: b, plan: planB },
        ]),
    });
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
          <p className="muted small">
            {rangeLabel(planWeek)} · {planned} of 7 planned
          </p>
        </div>
        <button className="icon-btn" onClick={() => setPlanWeek(addDays(planWeek, 7))} aria-label="Next week">
          <ChevronRight size={22} />
        </button>
      </header>

      <div className="week-strip" role="group" aria-label="Days this week">
        {days.map((d) => {
          const p = describePlan(state.plans[d]);
          const cls = [d === today && 'is-today', d < today && 'is-past', p && 'is-planned'].filter(Boolean).join(' ');
          return (
            <button key={d} className={`week-strip-day ${cls}`} onClick={() => openPicker(d)} aria-label={`${dayName(d)} ${shortDate(d)}${p ? `: ${p.title}` : ''}`}>
              <span className="week-strip-name">{dayShort(d)}</span>
              <span className="week-strip-num">{dayNum(d)}</span>
              <span className={`week-strip-dot ${catClass(p?.category)} ${p?.icon ? 'is-note' : ''}`} />
            </button>
          );
        })}
      </div>

      <ol className={`menu menu-lg plan-list ${drag ? 'is-dragging' : ''}`} ref={list}>
        {days.map((d, i) => {
          const p = describePlan(state.plans[d]);
          const dragging = drag?.from === i;
          const target = drag && drag.over === i && drag.from !== i;
          const cls = [d === today && 'is-today', d < today && 'is-past', dragging && 'dragging', target && 'drop-target'].filter(Boolean).join(' ');
          return (
            <li key={d} className={cls}>
              <button className="menu-row" onClick={() => openPicker(d)}>
                <span className="menu-day wide">
                  <span className="menu-day-name">{dayName(d)}</span>
                  <span className="menu-day-sub">{d === today ? 'Today' : shortDate(d)}</span>
                </span>
                <span className="menu-dish-wrap" style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}>
                  <span className={`menu-dish ${p ? '' : 'is-empty'}`}>{p ? p.title : 'Add dinner'}</span>
                  {p?.recipe && <span className="menu-sub">{p.recipe.category}{p.recipe.minutes ? ` · ${formatMinutes(p.recipe.minutes)}` : ''}</span>}
                </span>
                {p ? <Marker plan={p} /> : <Plus size={20} className="add-icon" />}
              </button>
              {p && (
                <span className="plan-row-tools">
                  <button className="icon-btn ghost" onClick={() => removeDinner(d)} aria-label={`Remove ${dayName(d)}'s dinner`}>
                    <X size={17} />
                  </button>
                  <button
                    className="icon-btn ghost grip"
                    aria-label={`Drag ${p.title} to another day`}
                    onPointerDown={(e) => onGripDown(e, i)}
                    onPointerMove={onGripMove}
                    onPointerUp={onGripUp}
                    onPointerCancel={onGripUp}
                  >
                    <GripVertical size={18} />
                  </button>
                </span>
              )}
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
