import { RECIPES_BY_ID } from '../data/recipes';
import type { DayPlan, Recipe } from '../types';

export const QUICK_NOTES = [
  { text: 'Leftovers', emoji: '🥡' },
  { text: 'Out', emoji: '🍽️' },
  { text: 'Takeaway', emoji: '🛵' },
];

export interface PlanDisplay {
  emoji: string;
  title: string;
  recipe?: Recipe;
}

export function describePlan(plan: DayPlan | undefined): PlanDisplay | null {
  if (!plan) return null;
  if (plan.kind === 'recipe') {
    const recipe = RECIPES_BY_ID[plan.recipeId];
    if (!recipe) return { emoji: '❓', title: 'Recipe no longer exists' };
    return { emoji: recipe.emoji ?? '🍽️', title: recipe.name, recipe };
  }
  const quick = QUICK_NOTES.find((q) => q.text.toLowerCase() === plan.text.toLowerCase());
  return { emoji: quick?.emoji ?? '📝', title: plan.text };
}
