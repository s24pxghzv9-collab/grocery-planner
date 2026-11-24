import { LayoutGrid, List, Search } from 'lucide-react';
import { useState } from 'react';
import { RECIPES, USED_CATEGORIES } from '../data/recipes';
import { catClass } from '../components/Marker';
import { RecipeThumb } from '../components/RecipeThumb';
import type { Ctx } from '../App';
import { formatMinutes } from '../lib/plan';
import type { Category, Recipe } from '../types';

const VIEW_KEY = 'dinner-planner:recipes-view';

export function Recipes({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'));
  const q = query.trim().toLowerCase();
  const list = RECIPES.filter(
    (r) =>
      (!category || r.category === category) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.source?.name.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleView = () => {
    const next = view === 'list' ? 'grid' : 'list';
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  return (
    <main className="screen">
      <header className="page-head">
        <div>
          <h1 className="title-lg">Recipes</h1>
        </div>
      </header>

      <div className="search">
        <Search size={18} className="search-icon" />
        <input
          className="input"
          type="search"
          placeholder="Search recipes, ingredients or sites"
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

      <div className="list-toolbar">
        <span className="muted">
          {list.length} recipe{list.length === 1 ? '' : 's'}
        </span>
        <button className="icon-btn" onClick={toggleView} aria-label={view === 'list' ? 'Show as grid' : 'Show as list'}>
          {view === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
        </button>
      </div>

      {view === 'list' ? (
        <ul className="recipe-list">
          {list.map((r) => (
            <li key={r.id}>
              <button className="recipe-list-row" onClick={() => ctx.openRecipe(r.id)}>
                <RecipeThumb recipe={r} />
                <span className="recipe-list-text">
                  <span className={`recipe-list-source ${catClass(r.category)}`}>
                    <i className="marker marker-dot marker-sm" />
                    {r.source?.name ?? r.category}
                  </span>
                  <span className="recipe-list-name">{r.name}</span>
                  <span className="muted small">{byline(r)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="recipe-cards">
          {list.map((r) => (
            <li key={r.id}>
              <button className="recipe-card" onClick={() => ctx.openRecipe(r.id)}>
                <RecipeThumb recipe={r} size="lg" />
                <span className="recipe-card-body">
                  <span className="recipe-card-name">{r.name}</span>
                  <span className="muted small">{r.minutes ? formatMinutes(r.minutes) : r.category}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.length === 0 && <p className="empty">No recipes match.</p>}
    </main>
  );
}

function byline(r: Recipe): string {
  return [r.author && `by ${r.author}`, r.minutes && formatMinutes(r.minutes)].filter(Boolean).join(' · ') || r.category;
}
