# Dinner Planner

A simple weekly dinner planner for the household. You pick dinners from a recipe bank,
and it builds the shopping list for you.

- **Home**: today's dinner, the week at a glance, and a shortcut to plan next week
- **Plan**: tap a day, tap a recipe. It moves on to the next empty day automatically.
- **List**: ingredients merged and grouped by aisle, tap to tick off, add extras, share as text
- **Recipes**: browse the recipe bank

See [DESIGN.md](DESIGN.md) for the design, the research behind it, and the list of later features.

## Recipes

The 66 household recipes were imported from Deglaze (Nov 2026). Each one is kept in
`data/deglaze/batch-*.json` with its original text as a backup, plus a tidied version for the
planner. To change a recipe, edit its batch file, then rebuild:

```bash
node scripts/build-recipes.mjs
```

That regenerates `src/data/imported-recipes.json` and warns about ingredients filed under
different aisles in different recipes. The conventions are in `data/deglaze/README.md`.
An in-app "Add recipe" (paste a link or add screenshots) is the next planned feature.

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

Sync needs a Redis database from Upstash, connected once in Vercel:

1. Open the project in Vercel, go to the **Storage** tab, and either **Create Database → Upstash for Redis**
   (Free plan) or **Connect** an existing Upstash database. One free database can be shared with other
   apps: this app keeps its data under keys starting with `dinner-planner:`.
2. Tick Production and Preview. The custom variable prefix doesn't matter, because the app finds
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` with or without a prefix, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. Redeploy (or push a commit), because new settings only apply to new deployments.

Until that's done, the app still works but saves on each phone separately. The app shows
"This phone only" at the top of Home when it isn't syncing. Anything planned before sync
was switched on is uploaded automatically the first time the app connects.

How it works: `api/household.ts` is a Vercel Function. Each edit is sent as a small operation
(e.g. "plan Tuesday", "tick potatoes"), stored one field per item in Redis, so two people
editing at once don't overwrite each other. See `src/lib/store.ts` and `api/_lib/household.ts`.

In local development (`npm run dev`) the API runs in memory. `SYNC=off npm run dev`
simulates a deployment with no database.
