import { Clock, ExternalLink, Pencil, Users } from 'lucide-react';
import { RECIPES_BY_ID } from '../data/recipes';
import type { Recipe } from '../types';
import { formatQty } from '../lib/shopping';
import { formatMinutes } from '../lib/plan';
import { catClass } from './Marker';
import { RecipeThumb } from './RecipeThumb';
import { Sheet } from './Sheet';

export function RecipeDetail({
  recipeId,
  onClose,
  onEdit,
}: {
  recipeId: string | null;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
}) {
  const recipe = recipeId ? RECIPES_BY_ID[recipeId] : null;
  if (!recipe) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      className={`recipe-sheet ${catClass(recipe.category)}`}
      kicker={
        <>
          <i className="marker marker-dot marker-sm" /> {recipe.category}
        </>
      }
      title={recipe.name}
    >
      {recipe.image && <RecipeThumb recipe={recipe} size="hero" />}

      <div className="recipe-facts">
        {recipe.minutes && (
          <span>
            <Clock size={16} /> {formatMinutes(recipe.minutes)}
          </span>
        )}
        {recipe.serves && (
          <span>
            <Users size={16} /> Serves {recipe.serves}
          </span>
        )}
        <span className="muted">{recipe.ingredients.length} ingredients</span>
        <button className="link edit-link" onClick={() => onEdit(recipe)}>
          <Pencil size={14} /> Edit
        </button>
      </div>

      <section>
        <h3 className="section-label">Ingredients</h3>
        <ul className="ingredients">
          {recipe.ingredients.map((i) => (
            <li key={i.name} className={i.staple ? 'staple' : ''}>
              <span className="ingredients-qty">{formatQty(i)}</span>
              <span>{i.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.method && recipe.method.length > 0 && (
        <section>
          <h3 className="section-label">Method</h3>
          <ol className="method">
            {recipe.method.map((step, n) => (
              <li key={n}>
                <span className="method-num">{n + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {recipe.notes && <p className="muted">{recipe.notes}</p>}

      {recipe.source && (
        <p className="recipe-source">
          {recipe.source.url ? (
            <a href={recipe.source.url} target="_blank" rel="noreferrer">
              View the original on {recipe.source.name} <ExternalLink size={14} />
            </a>
          ) : (
            <>From {recipe.source.name}</>
          )}
          {recipe.author && <span className="muted"> · by {recipe.author}</span>}
        </p>
      )}
    </Sheet>
  );
}
