import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guessCategory, parseIngredientLine, parseRecipeText } from './recipeReader';

const dir = 'data/deglaze';
const recipes = readdirSync(dir)
  .filter((f) => /^batch-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  .filter((r: { skip?: string }) => !r.skip);

describe('parseIngredientLine', () => {
  it('reads common shapes', () => {
    const one = (l: string) => parseIngredientLine(l)[0];
    expect(one('1 1/2 tbsp light soy sauce (sub all purpose soy, Note 1)')).toMatchObject({ name: 'soy sauce', qty: 1.5, unit: 'tbsp', staple: true });
    expect(one('250g / 8 oz medium prawns, raw, peeled and deveined')).toMatchObject({ name: 'raw prawns, peeled', qty: 250, unit: 'g' });
    expect(one('2 garlic cloves, minced')).toMatchObject({ name: 'garlic', qty: 2, unit: 'clove', aisle: 'Produce' });
    expect(one('1 lb ground beef')).toMatchObject({ name: 'beef mince', qty: 450, unit: 'g' });
    expect(one('½ cup grated Parmesan')).toMatchObject({ name: 'parmesan', qty: 0.5, unit: 'cup' });
    expect(one('1 (15oz) can coconut milk')).toMatchObject({ name: 'coconut milk', qty: 1, unit: 'tin' });
    expect(one('Juice of 1 lime')).toMatchObject({ name: 'lime', qty: 1 });
    expect(one('2–3 cups chicken stock')).toMatchObject({ name: 'chicken stock', qty: 3, unit: 'cup' });
    expect(one('• 3 spring onions, sliced 🌿')).toMatchObject({ name: 'spring onion', qty: 3 });
    expect(parseIngredientLine('Salt & Pepper').map((i) => i.name)).toEqual(['salt', 'black pepper']);
  });

  it('matches the hand-converted imports for most original lines', () => {
    let lines = 0;
    let hits = 0;
    const misses: string[] = [];
    for (const r of recipes) {
      const names = new Set(r.ingredients.map((i: { name: string }) => i.name));
      for (const section of r.raw) {
        for (const line of section.items) {
          lines++;
          const parsed = parseIngredientLine(line);
          if (parsed.some((p) => names.has(p.name))) hits++;
          else misses.push(`${line}  ->  ${parsed.map((p) => p.name).join(' + ') || '(nothing)'}`);
        }
      }
    }
    const score = hits / lines;
    console.log(`reader matched ${hits}/${lines} lines (${Math.round(score * 100)}%)`);
    console.log(misses.slice(0, 60).join('\n'));
    expect(score).toBeGreaterThan(0.88);
  });
});

describe('guessCategory', () => {
  it('matches the hand-picked category for most recipes', () => {
    const wrong = recipes.filter((r: { name: string; ingredients: { name: string }[]; category: string }) => guessCategory(r.ingredients, r.name) !== r.category);
    console.log('category misses:', wrong.map((r: { name: string; category: string; ingredients: { name: string }[] }) => `${r.name} (${r.category} -> ${guessCategory(r.ingredients, r.name)})`).join('; '));
    expect(wrong.length / recipes.length).toBeLessThan(0.1);
  });
});

describe('parseRecipeText', () => {
  it('splits a caption into title, ingredients and method', () => {
    const d = parseRecipeText(`Creamy Tuscan Gnocchi 🍝
Serves 4 | 25 mins

INGREDIENTS
- 500g potato gnocchi
- 2 tbsp olive oil
- 3 garlic cloves
- 1 cup cream
- 1/2 cup parmesan

METHOD
1. Fry the gnocchi in olive oil until golden.
2. Add garlic, then cream and parmesan, and simmer until thick.

Comment GNOCCHI for the recipe! #pasta #dinner`);
    expect(d.name).toBe('Creamy Tuscan Gnocchi');
    expect(d.serves).toBe(4);
    expect(d.minutes).toBe(25);
    expect(d.ingredients.map((i) => i.name)).toEqual(['potato gnocchi', 'olive oil', 'garlic', 'thickened cream', 'parmesan']);
    expect(d.method).toHaveLength(2);
    expect(d.method[0]).toBe('Fry the gnocchi in olive oil until golden.');
  });
});
