import { useState } from 'react';
import { ALL_TAGS, RECIPES } from '../data/recipes';
import type { Ctx } from '../App';

export function Recipes({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const list = RECIPES.filter(
    (r) =>
      (!tag || r.tags.includes(tag)) &&
      (!q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
  );

  return (
    <main className="screen">
      <header className="page-header">
        <h1>Recipes</h1>
        <p className="muted">{RECIPES.length} in the bank</p>
      </header>

      <div className="notice">These are sample recipes for now. The real ones are coming soon.</div>

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

      <ul className="recipe-grid">
        {list.map((r) => (
          <li key={r.id}>
            <button className="recipe-card" onClick={() => ctx.openRecipe(r.id)}>
              <span className="emoji-lg">{r.emoji ?? '🍽️'}</span>
              <strong>{r.name}</strong>
              <span className="muted small">
                {[r.minutes && `${r.minutes} min`, `${r.ingredients.length} ingredients`].filter(Boolean).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="empty">No recipes match.</p>}
    </main>
  );
}
