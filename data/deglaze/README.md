# Deglaze export (one-off, Nov 2026)

Alice's (and Reece's) recipes, exported read-only from Deglaze during a Pro trial so the
planner no longer depends on Deglaze.

- `index.json`: every recipe found in the household library, with Deglaze id and course.
- `batch-NN.json`: full recipes, about 10 per file. Each entry keeps the **original ingredient
  lines and method word for word** (`raw`, `method`) as a backup, plus the **converted**
  structured ingredients the app uses.
- `scripts/build-recipes.mjs` (repo root) turns the batches into `src/data/imported-recipes.json`,
  and writes `ingredient-dictionary.json`, which maps each ingredient name to its aisle and
  staple flag. That dictionary is reused by the in-app importer later.

## Conversion rules (keep consistent across batches)

- **name**: lowercase, singular where natural, no prep words ("brown onion", not "1 onion, diced").
  Use the same name everywhere so the shopping list merges ("garlic", "chicken thigh fillets",
  "beef mince", "olive oil", "parmesan").
- **qty/unit**: metric. Units: `g`, `kg`, `ml`, `L`, `tsp`, `tbsp`, `cup`, `clove`, `bunch`,
  `tin`, `jar`, `tub`, `pack`, `bag`, `sheet`, `slice`, `pinch`, `sprig`, `stalk`, `head`. Countable items have
  no unit ("2" eggs). If both metric and imperial are given, keep metric. Drop the qty if it's
  "to taste".
- **aisle**: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry, Spices & Sauces, Frozen, Other.
- **staple: true** for things normally in the cupboard: oils, salt, pepper, dried spices and herbs,
  sugar, flour, cornflour, soy/fish/oyster sauce, vinegar, stock cubes/powder, honey, rice,
  water (water is dropped entirely).
- **category** (main protein): Beef, Lamb, Pork (incl. sausage, bacon, prosciutto), Chicken,
  Seafood, Vegetarian, Other (turkey, mixed or unclear).
- **minutes**: Deglaze's total time, else an estimate from the method, else omitted.
- **serves**: a number from the servings text ("3 - 4 people" -> 4).
