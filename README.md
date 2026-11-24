# Dinner Planner

A simple weekly dinner planner for the household. You pick dinners from a recipe bank,
and it builds the shopping list for you.

- **Home**: today's dinner, the week at a glance, and a shortcut to plan next week
- **Plan**: tap a day, tap a recipe. It moves on to the next empty day automatically.
- **List**: ingredients merged and grouped by aisle, tap to tick off, add extras, share as text
- **Recipes**: browse the recipe bank

See [DESIGN.md](DESIGN.md) for the design, the research behind it, and the list of later features.

## Adding recipes

Edit [`src/data/recipes.ts`](src/data/recipes.ts). The instructions are at the top of the file.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # production build into dist/
```

## Deploying

Hosted on Vercel as a static Vite site (no settings needed). Every push to the
production branch redeploys automatically.

Data is stored in the browser on each device (localStorage), so plans don't sync
between phones yet.
