import { CATEGORY_ORDER, type Recipe } from '../types';
import imported from './imported-recipes.json';

/*
 * THE RECIPE BANK
 * ---------------
 * The household's recipes, imported from Deglaze in Nov 2026. The generated file
 * `imported-recipes.json` is built from `data/deglaze/batch-*.json` by
 * `node scripts/build-recipes.mjs`, so edit the batch files (not the JSON) and rebuild.
 * See data/deglaze/README.md for the conventions (ingredient names, aisles, staples).
 */
export const RECIPES: Recipe[] = imported as Recipe[];

/**
 * The app launched with sample recipes. Plans made then still refer to their ids, so point
 * those at the real recipe where there's a match. Unmatched ones show as "Recipe no longer exists".
 */
const OLD_IDS: Record<string, string> = {
  'prawn-stirfry': 'prawn-stir-fry',
  'beef-wellington': 'beef-wellington-chestnut',
  'steak-bbq': 'ribeye-steak',
  'chicken-tacos': 'chicken-katsu-smashed-tacos',
  'crispy-chicken-bowls': 'hot-honey-crispy-chicken-bowls',
};

export const RECIPES_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
for (const [oldId, newId] of Object.entries(OLD_IDS)) {
  if (RECIPES_BY_ID[newId]) RECIPES_BY_ID[oldId] = RECIPES_BY_ID[newId];
}

/** Categories that have at least one recipe, in a fixed order. */
export const USED_CATEGORIES = CATEGORY_ORDER.filter((c) => RECIPES.some((r) => r.category === c));
