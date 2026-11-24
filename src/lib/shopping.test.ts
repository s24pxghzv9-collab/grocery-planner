import { describe, expect, it } from 'vitest';
import { buildShoppingList, formatQty } from './shopping';
import { addDays, weekStart } from './dates';
import type { Recipe } from '../types';

const r = (id: string, ingredients: Recipe['ingredients']): Recipe => ({ id, name: id, tags: [], ingredients });

const recipes = {
  a: r('a', [
    { name: 'Brown onion', qty: 1, aisle: 'Produce' },
    { name: 'beef mince', qty: 500, unit: 'g', aisle: 'Meat & Seafood' },
    { name: 'salt', aisle: 'Spices & Sauces', staple: true },
  ]),
  b: r('b', [
    { name: 'brown onion', qty: 2, aisle: 'Produce' },
    { name: 'beef mince', qty: 0.6, unit: 'kg', aisle: 'Meat & Seafood' },
  ]),
};

describe('buildShoppingList', () => {
  it('merges the same ingredient across meals and records which meals need it', () => {
    const items = buildShoppingList(
      ['d1', 'd2', 'd3'],
      { d1: { kind: 'recipe', recipeId: 'a' }, d2: { kind: 'note', text: 'Out' }, d3: { kind: 'recipe', recipeId: 'b' } },
      recipes,
    );
    const onion = items.find((i) => i.name.toLowerCase() === 'brown onion')!;
    expect(onion.qty).toBe(3);
    expect(onion.forMeals).toEqual(['a', 'b']);
    const mince = items.find((i) => i.name === 'beef mince')!;
    expect(formatQty(mince)).toBe('1.1 kg');
    expect(items.find((i) => i.name === 'salt')?.staple).toBe(true);
    // Sorted by aisle: produce first
    expect(items[0].aisle).toBe('Produce');
  });

  it('ignores days with missing recipes', () => {
    expect(buildShoppingList(['d1'], { d1: { kind: 'recipe', recipeId: 'gone' } }, recipes)).toEqual([]);
  });
});

describe('dates', () => {
  it('finds the start of the week', () => {
    // 2026-11-24 is a Tuesday
    expect(weekStart('2026-11-24', 0)).toBe('2026-11-22');
    expect(weekStart('2026-11-24', 1)).toBe('2026-11-23');
    expect(weekStart('2026-11-22', 0)).toBe('2026-11-22');
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02');
  });
});
