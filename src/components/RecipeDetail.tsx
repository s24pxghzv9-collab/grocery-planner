import { RECIPES_BY_ID } from '../data/recipes';
import { formatQty } from '../lib/shopping';
import { Sheet } from './Sheet';

export function RecipeDetail({ recipeId, onClose }: { recipeId: string | null; onClose: () => void }) {
  const recipe = recipeId ? RECIPES_BY_ID[recipeId] : null;
  if (!recipe) return null;

  const meta = [recipe.minutes && `${recipe.minutes} min`, recipe.serves && `Serves ${recipe.serves}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Sheet open onClose={onClose} title={`${recipe.emoji ?? ''} ${recipe.name}`} subtitle={meta}>
      <div className="chip-row">
        {recipe.tags.map((t) => (
          <span key={t} className="chip chip-sm chip-static">
            {t}
          </span>
        ))}
      </div>

      <h3 className="section-title">Ingredients</h3>
      <ul className="ingredient-list">
        {recipe.ingredients.map((i) => (
          <li key={i.name}>
            <span className="qty">{formatQty(i)}</span>
            <span>{i.name}</span>
          </li>
        ))}
      </ul>

      {recipe.method && recipe.method.length > 0 && (
        <>
          <h3 className="section-title">Method</h3>
          <ol className="method">
            {recipe.method.map((step, n) => (
              <li key={n}>{step}</li>
            ))}
          </ol>
        </>
      )}
      {recipe.notes && <p className="muted">{recipe.notes}</p>}
    </Sheet>
  );
}
