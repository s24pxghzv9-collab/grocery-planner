export type Aisle =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Pantry'
  | 'Spices & Sauces'
  | 'Frozen'
  | 'Other';

export const AISLE_ORDER: Aisle[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry',
  'Spices & Sauces',
  'Frozen',
  'Other',
];

export interface Ingredient {
  name: string;
  qty?: number;
  unit?: string; // e.g. 'g', 'ml', 'tbsp'. Leave empty for countable items ("2 onions")
  aisle: Aisle;
  /** Things most kitchens already have (salt, oil). Shown separately on the list. */
  staple?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  emoji?: string;
  tags: string[];
  serves?: number;
  minutes?: number;
  ingredients: Ingredient[];
  method?: string[];
  notes?: string;
}

/** What's on for a given night: a recipe, or a free-text note like "Out" or "Liz's party". */
export type DayPlan = { kind: 'recipe'; recipeId: string } | { kind: 'note'; text: string };

export interface ExtraItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface WeekShopping {
  /** Ticked-off generated items, keyed by ingredient key. */
  checked: Record<string, boolean>;
  extras: ExtraItem[];
}

export interface AppState {
  version: 1;
  /** Keyed by ISO date (yyyy-mm-dd). */
  plans: Record<string, DayPlan>;
  /** Keyed by the ISO date the week starts on. */
  shopping: Record<string, WeekShopping>;
  /** Previously used extras, most recent first. Used for quick-add chips. */
  extrasHistory: string[];
  settings: {
    weekStartsOn: number; // 0 = Sunday
  };
}
