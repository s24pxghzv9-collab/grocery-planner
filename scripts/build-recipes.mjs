#!/usr/bin/env node
// Builds src/data/imported-recipes.json from data/deglaze/batch-*.json.
// Also writes data/deglaze/ingredient-dictionary.json (name -> aisle/staple) and reports
// ingredients filed under different aisles in different recipes, so they can be fixed.
// Usage: node scripts/build-recipes.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data/deglaze');
const AISLES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices & Sauces', 'Frozen', 'Other'];
const CATEGORIES = ['Beef', 'Lamb', 'Pork', 'Chicken', 'Seafood', 'Vegetarian', 'Other'];

/**
 * Deglaze photo URLs look like https://cdn.deglaze.app/photos/w/<base64url original>/w288?h=...
 * For recipe websites, use the original (full size, stable). Instagram/TikTok originals are
 * signed URLs that expire, so keep Deglaze's copy for those.
 */
function photo(url) {
  if (!url) return undefined;
  const m = url.match(/\/photos\/w\/([^/]+)\//);
  if (!m) return url;
  try {
    const original = Buffer.from(m[1], 'base64url').toString('utf8');
    if (/cdninstagram|fbcdn|tiktokcdn|instagram\.com|tiktok/.test(original)) return url;
    return original.startsWith('http') ? original : url;
  } catch {
    return url;
  }
}

const files = readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f)).sort();
const recipes = [];
const dict = new Map(); // name -> { aisle, staple, uses }
const problems = [];
const ids = new Set();

for (const f of files) {
  for (const r of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
    if (r.skip) continue;
    const where = `${f} / ${r.name}`;
    if (ids.has(r.id)) problems.push(`duplicate id ${r.id} (${where})`);
    ids.add(r.id);
    if (!CATEGORIES.includes(r.category)) problems.push(`bad category "${r.category}" (${where})`);
    for (const i of r.ingredients) {
      if (!AISLES.includes(i.aisle)) problems.push(`bad aisle "${i.aisle}" for ${i.name} (${where})`);
      const seen = dict.get(i.name);
      if (!seen) dict.set(i.name, { aisle: i.aisle, staple: !!i.staple, uses: 1 });
      else {
        seen.uses++;
        if (seen.aisle !== i.aisle || seen.staple !== !!i.staple)
          problems.push(`"${i.name}" is ${seen.aisle}/${seen.staple ? 'staple' : 'not staple'} elsewhere but ${i.aisle}/${i.staple ? 'staple' : 'not staple'} in ${where}`);
      }
    }
    recipes.push({
      id: r.id,
      name: r.name,
      category: r.category,
      tags: r.tags ?? [],
      serves: r.serves,
      minutes: r.minutes,
      ingredients: r.ingredients.map(({ name, qty, unit, aisle, staple }) => ({
        name,
        ...(qty != null && { qty }),
        ...(unit && { unit }),
        aisle,
        ...(staple && { staple: true }),
      })),
      method: r.method,
      notes: r.notes,
      image: photo(r.photo),
      source: r.source,
      author: r.author,
    });
  }
}

recipes.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(root, 'src/data/imported-recipes.json'), JSON.stringify(recipes, null, 1) + '\n');
const dictJson = Object.fromEntries([...dict].sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(dir, 'ingredient-dictionary.json'), JSON.stringify(dictJson, null, 1) + '\n');
// Compact copy for the in-app recipe reader: name -> [aisle, staple].
writeFileSync(
  join(root, 'src/data/ingredient-dictionary.json'),
  JSON.stringify(Object.fromEntries(Object.entries(dictJson).map(([n, v]) => [n, [v.aisle, v.staple ? 1 : 0]]))) + '\n',
);
console.log(`${recipes.length} recipes, ${dict.size} distinct ingredients from ${files.length} batch file(s)`);
if (problems.length) {
  console.log(`\n${problems.length} thing(s) to check:`);
  for (const p of problems) console.log(' - ' + p);
}
