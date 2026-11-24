import { useState } from 'react';
import type { Recipe } from '../types';
import { catClass } from './Marker';

/** Recipe photo, or a tinted tile with the first letter when there's no photo (or it fails to load). */
export function RecipeThumb({ recipe, size = 'md' }: { recipe: Recipe; size?: 'md' | 'lg' | 'hero' }) {
  const [failed, setFailed] = useState(false);
  const cls = `thumb thumb-${size} ${catClass(recipe.category)}`;
  if (recipe.image && !failed) {
    return (
      <span className={cls}>
        <img src={recipe.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      </span>
    );
  }
  // On the recipe page, no photo means no box at all.
  if (size === 'hero') return null;
  return (
    <span className={`${cls} thumb-tile`} aria-hidden>
      <span className="thumb-initial">{recipe.name[0]}</span>
    </span>
  );
}
