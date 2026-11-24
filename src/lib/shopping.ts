import { AISLE_ORDER, type Aisle, type DayPlan, type Recipe } from '../types';

export interface ShoppingItem {
  key: string;
  name: string;
  qty?: number;
  unit?: string;
  aisle: Aisle;
  staple: boolean;
  /** Names of the meals that need this item. */
  forMeals: string[];
}

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function itemKey(name: string, unit?: string): string {
  return `${normalise(name)}|${(unit ?? '').trim().toLowerCase()}`;
}

/**
 * Builds the merged shopping list for a set of days. Same ingredient + same unit
 * are summed ("2 onions" + "1 onion" = "3 onions").
 */
export function buildShoppingList(
  days: string[],
  plans: Record<string, DayPlan>,
  recipesById: Record<string, Recipe>,
): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>();

  for (const day of days) {
    const plan = plans[day];
    if (plan?.kind !== 'recipe') continue;
    const recipe = recipesById[plan.recipeId];
    if (!recipe) continue;

    for (const raw of recipe.ingredients) {
      const ing = toBaseUnit(raw);
      const key = itemKey(ing.name, ing.unit);
      const existing = items.get(key);
      if (existing) {
        if (ing.qty != null) existing.qty = (existing.qty ?? 0) + ing.qty;
        if (!existing.forMeals.includes(recipe.name)) existing.forMeals.push(recipe.name);
      } else {
        items.set(key, {
          key,
          name: ing.name,
          qty: ing.qty,
          unit: ing.unit,
          aisle: ing.aisle,
          staple: !!ing.staple,
          forMeals: [recipe.name],
        });
      }
    }
  }

  return [...items.values()].sort(
    (a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) || a.name.localeCompare(b.name),
  );
}

/** kg → g and L → ml, so "1 kg potatoes" and "500 g potatoes" add up. */
function toBaseUnit<T extends { qty?: number; unit?: string }>(ing: T): T {
  const unit = ing.unit?.trim().toLowerCase();
  if (ing.qty != null && unit === 'kg') return { ...ing, qty: ing.qty * 1000, unit: 'g' };
  if (ing.qty != null && unit === 'l') return { ...ing, qty: ing.qty * 1000, unit: 'ml' };
  return ing;
}

function round(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** "500 g beef mince", "3 onions" style label for the quantity part. */
export function formatQty(item: { qty?: number; unit?: string }): string {
  if (item.qty == null) return '';
  let { qty } = item;
  let unit = item.unit ?? '';
  if (unit === 'g' && qty >= 1000) {
    qty /= 1000;
    unit = 'kg';
  } else if (unit === 'ml' && qty >= 1000) {
    qty /= 1000;
    unit = 'L';
  }
  return unit ? `${round(qty)} ${unit}` : `${round(qty)}×`;
}

export function groupByAisle<T extends { aisle: Aisle }>(items: T[]): [Aisle, T[]][] {
  const groups = new Map<Aisle, T[]>();
  for (const item of items) {
    const list = groups.get(item.aisle) ?? [];
    list.push(item);
    groups.set(item.aisle, list);
  }
  return AISLE_ORDER.filter((a) => groups.has(a)).map((a) => [a, groups.get(a)!]);
}
