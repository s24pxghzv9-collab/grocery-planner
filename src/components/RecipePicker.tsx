import { useMemo, useState } from 'react';
import { ALL_TAGS, RECIPES } from '../data/recipes';
import { addDays, dayName, shortDate } from '../lib/dates';
import { QUICK_NOTES } from '../lib/plan';
import type { DayPlan } from '../types';
import { Sheet } from './Sheet';

interface Props {
  day: string | null;
  plans: Record<string, DayPlan>;
  weekDays: string[];
  onPick: (day: string, plan: DayPlan | null) => void;
  onClose: () => void;
}

export function RecipePicker({ day, plans, weekDays, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string | null>(null);

  // Recipes already used this week, or in the 7 days before it, to help avoid repeats.
  const recentUse = useMemo(() => {
    const thisWeek = new Set<string>();
    const lastWeek = new Set<string>();
    if (weekDays.length === 0) return { thisWeek, lastWeek };
    for (const d of weekDays) {
      const p = plans[d];
      if (p?.kind === 'recipe' && d !== day) thisWeek.add(p.recipeId);
    }
    for (let i = 1; i <= 7; i++) {
      const p = plans[addDays(weekDays[0], -i)];
      if (p?.kind === 'recipe') lastWeek.add(p.recipeId);
    }
    return { thisWeek, lastWeek };
  }, [plans, weekDays, day]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECIPES.filter(
      (r) =>
        (!tag || r.tags.includes(tag)) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
    );
  }, [query, tag]);

  if (!day) return null;
  const current = plans[day];

  const pick = (plan: DayPlan | null) => {
    setQuery('');
    setCustomNote(null);
    onPick(day, plan);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={<span key={day} className="fade-in">{dayName(day)}</span>}
      subtitle={shortDate(day)}
      footer={
        <button className="btn btn-block" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="chip-row">
        {QUICK_NOTES.map((n) => (
          <button
            key={n.text}
            className={`chip ${current?.kind === 'note' && current.text === n.text ? 'chip-on' : ''}`}
            onClick={() => pick({ kind: 'note', text: n.text })}
          >
            {n.emoji} {n.text}
          </button>
        ))}
        <button className="chip" onClick={() => setCustomNote(current?.kind === 'note' ? current.text : '')}>
          📝 Note…
        </button>
        {current && (
          <button className="chip chip-danger" onClick={() => pick(null)}>
            Clear
          </button>
        )}
      </div>

      {customNote !== null && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (customNote.trim()) pick({ kind: 'note', text: customNote.trim() });
          }}
        >
          <input
            autoFocus
            className="input"
            placeholder="e.g. Liz's party"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
          />
          <button className="btn" type="submit">
            Save
          </button>
        </form>
      )}

      <input
        className="input search"
        type="search"
        placeholder="Search recipes or ingredients"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chip-row scroll-x">
        <button className={`chip chip-sm ${!tag ? 'chip-on' : ''}`} onClick={() => setTag(null)}>
          All
        </button>
        {ALL_TAGS.map((t) => (
          <button key={t} className={`chip chip-sm ${tag === t ? 'chip-on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      <ul className="pick-list">
        {filtered.map((r) => {
          const selected = current?.kind === 'recipe' && current.recipeId === r.id;
          const hint = recentUse.thisWeek.has(r.id)
            ? 'Already this week'
            : recentUse.lastWeek.has(r.id)
              ? 'Had last week'
              : null;
          return (
            <li key={r.id}>
              <button className={`pick-item ${selected ? 'selected' : ''}`} onClick={() => pick({ kind: 'recipe', recipeId: r.id })}>
                <span className="emoji">{r.emoji ?? '🍽️'}</span>
                <span className="pick-text">
                  <strong>{r.name}</strong>
                  <span className="muted small">
                    {[r.minutes && `${r.minutes} min`, ...r.tags.slice(0, 2)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {hint && <span className="badge">{hint}</span>}
                {selected && <span className="tick">✓</span>}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="empty">No recipes match “{query}”.</li>}
      </ul>
    </Sheet>
  );
}
