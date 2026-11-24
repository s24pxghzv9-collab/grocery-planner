import { Search } from 'lucide-react';
import { useState } from 'react';
import { RECIPES, USED_CATEGORIES } from '../data/recipes';
import { catClass } from '../components/Marker';
import type { Ctx } from '../App';
import type { Category } from '../types';

export function Recipes({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const q = query.trim().toLowerCase();
  const list = RECIPES.filter(
    (r) =>
      (!category || r.category === category) &&
      (!q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="screen">
      <header className="page-head">
        <div>
          <h1 className="title-lg">Recipes</h1>
          <p className="muted small">{RECIPES.length} in the collection · sample recipes for now</p>
        </div>
      </header>

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

      <ul className="recipe-cards">
        {list.map((r) => (
          <li key={r.id}>
            <button className={`recipe-card ${catClass(r.category)}`} onClick={() => ctx.openRecipe(r.id)}>
              <span className="recipe-card-top">
                <span className="recipe-card-cat">{r.category}</span>
                <span className="recipe-card-initial" aria-hidden>
                  {r.name[0]}
                </span>
              </span>
              <span className="recipe-card-body">
                <span className="recipe-card-name">{r.name}</span>
                <span className="muted small">{r.minutes ? `${r.minutes} min` : `${r.ingredients.length} ingredients`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="empty">No recipes match.</p>}
    </main>
  );
}
