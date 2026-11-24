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

## Sharing between phones

Everyone with the link shares one household plan and shopping list. There are no logins.
Edits show instantly on your own phone, are saved there if you have no signal, and
sync to the other phone within a few seconds.

Sync needs a small free database, set up once in Vercel:

1. Open the project in Vercel, go to the **Storage** tab, and click **Create Database**.
2. Choose **Upstash for Redis** (from the Marketplace). The free plan is plenty.
3. Connect it to this project with all environments ticked, and accept the defaults.
4. Go to **Deployments**, then **Redeploy** the latest one so it picks up the new settings.

Until that's done, the app still works but saves on each phone separately. The app shows
"This phone only" at the top of Home when it isn't syncing. Anything planned before sync
was switched on is uploaded automatically the first time the app connects.

How it works: `api/household.ts` is a Vercel Function. Each edit is sent as a small operation
(e.g. "plan Tuesday", "tick potatoes"), stored one field per item in Redis, so two people
editing at once don't overwrite each other. See `src/lib/store.ts` and `api/_lib/household.ts`.

In local development (`npm run dev`) the API runs in memory. `SYNC=off npm run dev`
simulates a deployment with no database.
