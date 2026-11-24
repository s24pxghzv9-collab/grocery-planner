import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RECIPES, USED_CATEGORIES } from '../data/recipes';
import { addDays, dayName, shortDate } from '../lib/dates';
import { NOTE_ICON, QUICK_NOTES, recipeMeta } from '../lib/plan';
import type { Category, DayPlan } from '../types';
import { catClass } from './Marker';
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
  const [category, setCategory] = useState<Category | null>(null);
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
        (!category || r.category === category) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
    );
  }, [query, category]);

  if (!day) return null;
  const current = plans[day];
  const planned = weekDays.filter((d) => plans[d]).length;

  const pick = (plan: DayPlan | null) => {
    setQuery('');
    setCustomNote(null);
    onPick(day, plan);
  };

  const isNote = (text: string) => current?.kind === 'note' && current.text.toLowerCase() === text.toLowerCase();
  const isCustomNote = current?.kind === 'note' && !QUICK_NOTES.some((q) => isNote(q.text));

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span key={day} className="fade-in">
          {dayName(day)}
        </span>
      }
      subtitle={`${shortDate(day)} · ${planned} of 7 planned`}
      footer={
        <div className="sheet-footer-row">
          {current && (
            <button className="btn btn-quiet" onClick={() => pick(null)}>
              <X size={16} /> Clear day
            </button>
          )}
          <button className="btn btn-primary grow" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="quick-notes">
        {QUICK_NOTES.map(({ text, icon: Icon }) => (
          <button key={text} className={`quick-note ${isNote(text) ? 'on' : ''}`} onClick={() => pick({ kind: 'note', text })}>
            <Icon size={20} strokeWidth={1.75} />
            <span>{text}</span>
          </button>
        ))}
        <button
          className={`quick-note ${isCustomNote ? 'on' : ''}`}
          onClick={() => setCustomNote(current?.kind === 'note' && isCustomNote ? current.text : '')}
        >
          <NOTE_ICON size={20} strokeWidth={1.75} />
          <span>{isCustomNote && current?.kind === 'note' ? current.text : 'Note'}</span>
        </button>
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
          <button className="btn btn-primary" type="submit" disabled={!customNote.trim()}>
            Save
          </button>
        </form>
      )}

      <div className="search">
        <Search size={18} className="search-icon" />
        <input
          className="input"
          type="search"
          placeholder="Search recipes or ingredients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="filters">
        <button className={`filter ${!category ? 'on' : ''}`} onClick={() => setCategory(null)}>
          All
        </button>
        {USED_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`filter ${catClass(c)} ${category === c ? 'on' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            <i className="marker marker-dot marker-sm" />
            {c}
          </button>
        ))}
      </div>

      <ul className="recipe-rows">
        {filtered.map((r) => {
          const selected = current?.kind === 'recipe' && current.recipeId === r.id;
          const thisWeek = recentUse.thisWeek.has(r.id);
          const hint = thisWeek ? 'Already this week' : recentUse.lastWeek.has(r.id) ? 'Had last week' : null;
          return (
            <li key={r.id}>
              <button className={`recipe-row ${catClass(r.category)} ${selected ? 'selected' : ''}`} onClick={() => pick({ kind: 'recipe', recipeId: r.id })}>
                <span className="recipe-row-bar" />
                <span className="recipe-row-text">
                  <span className="recipe-row-name">{r.name}</span>
                  <span className="recipe-row-meta">
                    {recipeMeta(r)}
                    {hint && <span className={`hint ${thisWeek ? 'strong' : ''}`}> · {hint}</span>}
                  </span>
                </span>
                {selected && <Check size={20} className="recipe-row-check" />}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="empty">No recipes match.</li>}
      </ul>
    </Sheet>
  );
}
