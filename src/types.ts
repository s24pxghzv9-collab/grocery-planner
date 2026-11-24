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

/** Main protein. Drives the colour coding so it's easy to see variety across the week. */
export type Category = 'Beef' | 'Lamb' | 'Pork' | 'Chicken' | 'Seafood' | 'Vegetarian' | 'Other';

export const CATEGORY_ORDER: Category[] = ['Beef', 'Lamb', 'Pork', 'Chicken', 'Seafood', 'Vegetarian', 'Other'];

export interface Recipe {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  serves?: number;
  minutes?: number;
  ingredients: Ingredient[];
  method?: string[];
  notes?: string;
  /** Photo URL. Recipes without one show a coloured tile with the first letter. */
  image?: string;
  /** Where the recipe came from, e.g. { name: 'RecipeTin Eats', url: 'https://…' }. */
  source?: { name: string; url?: string };
  author?: string;
}

/** What's on for a given night: a recipe, or a free-text note like "Out" or "Liz's party". */
export type DayPlan = { kind: 'recipe'; recipeId: string } | { kind: 'note'; text: string };

export interface ExtraItem {
  id: string;
  text: string;
  checked: boolean;
  /** When it was added (ms), for stable ordering across devices. */
  at?: number;
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

/**
 * A single change to the shared state. Every edit in the app is expressed as ops so
 * they can be applied instantly on this phone, queued while offline, and merged on
 * the server without one person's edit overwriting another's.
 */
export type Op =
  | { t: 'plan'; date: string; plan: DayPlan | null }
  | { t: 'check'; week: string; key: string; on: boolean }
  | { t: 'extra'; week: string; item: ExtraItem }
  | { t: 'extraDel'; week: string; id: string }
  | { t: 'settings'; settings: AppState['settings'] }
  | { t: 'history'; list: string[] };
