import { CookingPot, NotebookPen, ShoppingBag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { RECIPES_BY_ID } from '../data/recipes';
import type { Category, DayPlan, Recipe } from '../types';

export const QUICK_NOTES: { text: string; icon: LucideIcon }[] = [
  { text: 'Leftovers', icon: CookingPot },
  { text: 'Out', icon: UtensilsCrossed },
  { text: 'Takeaway', icon: ShoppingBag },
];

export const NOTE_ICON = NotebookPen;

export interface PlanDisplay {
  title: string;
  /** Set for recipes. */
  recipe?: Recipe;
  category?: Category;
  /** Set for notes (Out, Leftovers, custom). */
  icon?: LucideIcon;
}

export function describePlan(plan: DayPlan | undefined): PlanDisplay | null {
  if (!plan) return null;
  if (plan.kind === 'recipe') {
    const recipe = RECIPES_BY_ID[plan.recipeId];
    if (!recipe) return { title: 'Recipe no longer exists', icon: NotebookPen };
    return { title: recipe.name, recipe, category: recipe.category };
  }
  const quick = QUICK_NOTES.find((q) => q.text.toLowerCase() === plan.text.toLowerCase());
  return { title: plan.text, icon: quick?.icon ?? NOTE_ICON };
}

/** 25 -> "25 min", 90 -> "1½ hr", 75 -> "1 hr 15 min", 390 -> "6½ hr". */
export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${h} hr`;
  if (rest === 30) return `${h}½ hr`;
  return `${h} hr ${rest} min`;
}

/** "Beef · 30 min" */
export function recipeMeta(r: Recipe, opts: { serves?: boolean } = {}): string {
  return [r.category, r.minutes && formatMinutes(r.minutes), opts.serves && r.serves && `Serves ${r.serves}`]
    .filter(Boolean)
    .join(' · ');
}
