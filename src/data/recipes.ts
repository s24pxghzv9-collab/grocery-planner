import { CATEGORY_ORDER, type Category, type Recipe } from '../types';
import imported from './imported-recipes.json';

/*
 * THE RECIPE BANK
 * ---------------
 * Two sources, merged:
 *  1. Built in: the household's recipes imported from Deglaze in Nov 2026
 *     (`imported-recipes.json`, built from `data/deglaze/batch-*.json` by
 *     `node scripts/build-recipes.mjs`; see data/deglaze/README.md).
 *  2. Added or edited in the app: stored in the shared household data (`state.recipes`) so
 *     they sync between phones. An edited built-in recipe is saved there under the same id,
 *     which overrides the built-in version.
 *
 * The exports below are live: App calls setHouseholdRecipes() whenever the shared recipes
 * change, and every screen reads the merged list from here.
 */
export const BUILT_IN: Recipe[] = imported as Recipe[];
const BUILT_IN_IDS = new Set(BUILT_IN.map((r) => r.id));

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

export let RECIPES: Recipe[] = [];
export const RECIPES_BY_ID: Record<string, Recipe> = {};
/** Categories that have at least one recipe, in a fixed order. */
export let USED_CATEGORIES: Category[] = [];

let current: Record<string, Recipe> | null = null;

export function setHouseholdRecipes(household: Record<string, Recipe>) {
  if (household === current) return;
  current = household;
  const merged = new Map(BUILT_IN.map((r) => [r.id, r]));
  for (const r of Object.values(household)) {
    if (r.deleted) merged.delete(r.id);
    else merged.set(r.id, r);
  }
  RECIPES = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const k of Object.keys(RECIPES_BY_ID)) delete RECIPES_BY_ID[k];
  for (const r of RECIPES) RECIPES_BY_ID[r.id] = r;
  for (const [oldId, newId] of Object.entries(OLD_IDS)) {
    if (RECIPES_BY_ID[newId] && !RECIPES_BY_ID[oldId]) RECIPES_BY_ID[oldId] = RECIPES_BY_ID[newId];
  }
  USED_CATEGORIES = CATEGORY_ORDER.filter((c) => RECIPES.some((r) => r.category === c));
}

export function isBuiltIn(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}

setHouseholdRecipes({});
