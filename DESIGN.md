# Dinner Planner — Design

## The problem

Alice plans dinners in a notes app: a list of days, a dinner under each one, and a
loose list of groceries underneath. This works, but:

- the grocery list is typed by hand, separately from the meals, so ingredients get missed
- not every night is a recipe ("Liz's party", "out", "left overs")
- non-food items get added too ("Zip lock", "Eco store spray", "Coffee beans")
- a plan usually runs from one shopping day to the next, not Monday to Sunday

## Goals for v1

1. **Home shows the week at a glance**: today highlighted, tonight's dinner front and centre.
2. **Planning is quick**: tap a day, then tap a recipe. Done.
3. **The shopping list builds itself** from the planned recipes, merged and grouped by aisle.
4. **Easy to start next week**: one button from the home screen.
5. Works well on a phone and can be added to the home screen like an app.

## What makes a meal planner easy to use (research)

Based on common patterns in meal-planning apps (Mealime, Plan to Eat, Prepear,
AnyList) and their user reviews:

| Pattern | Why it matters | How we use it |
|---|---|---|
| Grocery list generated from the plan | The main time-saver; stops ingredients being forgotten | List is built live from the week's recipes |
| Merge duplicate ingredients | "2 onions + 1 onion" should be "3 onions" | Combine by name and unit, and show which meals need each item |
| Sort by store aisle | Fewer trips back and forth in the shop | Items grouped by aisle (Produce, Meat, Dairy…) |
| Pantry staples separated | A common complaint: salt and oil clutter every list | Staples go in a collapsed "Check you have" section |
| Add your own items | Household items (zip lock bags, spray) bought on the same trip | "Extras" with one-tap chips for items added before |
| Editing the plan doesn't reset the list | Reviewers complain about losing ticked-off items | Ticks are stored per item, so changing a meal keeps them |
| Non-recipe days | Real weeks include eating out, parties, leftovers | Quick options: Out, Leftovers, Takeaway, or a custom note |
| Mobile-first, big touch targets | It's used in the kitchen and the supermarket | Bottom tabs, 48px+ rows, bottom-sheet picker, dark mode |
| Few steps | People drop apps that feel like admin | Picker skips to the next empty day after each pick |

## Screens

Bottom tab bar: **Home · Plan · List · Recipes**

### Home
- Header with the date range ("Sun 22 – Sat 28 Nov")
- **Week strip**: 7 day pills with today highlighted and past days faded. Tap a day to plan it.
- **Tonight card**: big recipe name, prep time, "View recipe" button. Shows "Nothing planned — pick something" when empty.
- **Rest of the week** as a compact list.
- **Next week card**: "3 of 7 dinners planned" with a **Plan next week** button.
- **Shopping card**: "12 items to get" with a link to the list.

### Plan
- Week switcher (‹ This week ›) with arrows for next and previous weeks.
- One row per day: tap it to open the picker.
- Picker (bottom sheet):
  - search box
  - quick options: Leftovers, Out, Takeaway, custom note, Clear
  - recipe list with "Had last week" hints so meals don't repeat too often
  - after a pick, it moves straight on to the next empty day (a whole week takes about 7 taps)
- Week actions: **Copy last week**, **Clear week**.

### Shopping list
- Choose the week (This week / Next week).
- Items grouped by aisle, tap to tick off, ticked items sink to the bottom.
- "For: Beef Wellington, Mexican beef" under each item.
- Pantry staples in a collapsed section.
- Extras: free-text input plus chips for previous extras (Zip lock, Coffee beans…).
- **Share** button sends the list as text to Messages or WhatsApp, so Reece can do the shop.

### Recipes
- Searchable bank of recipes, with filter by tag.
- Recipe detail: ingredients, method and notes.

## Visual design

The look is a printed kitchen menu or cookbook rather than an app template.

- **Type**: Fraunces (a warm serif) for dish names and headings, and Instrument Sans for everything else.
  The food is the hero, so it's set in the serif.
- **Colour**: paper and ink, with one tomato accent used only for *today* and warnings.
  Primary buttons are ink, not a brand colour.
- **Protein colours**: each recipe has a category (Beef, Lamb, Pork, Chicken, Seafood, Vegetarian),
  shown as a small muted dot or bar, so a week of three beef dinners is obvious at a glance.
  These replaced emojis.
- **Structure**: thin dividers instead of boxed cards. The week reads like a menu: day on the left, dish on the right.
  The one dark "Tonight" card is the only heavy element on the home screen.
- **Icons**: Lucide line icons at 1.6–2px stroke.
- **Dark mode**: the same system with inverted paper and ink, so the Tonight card becomes light on dark.
- **Motion**: sheets slide up, ticks pop, and screens fade in. All of it is turned off when the phone's reduced-motion setting is on.

## Technical approach

- **Vite + React + TypeScript**, a static site deployed on **Vercel**. No server and no logins for v1.
- **Shared household via one link**: a Vercel Function plus Upstash Redis. Edits are small
  operations stored one field per item, so simultaneous edits merge. Each phone keeps a local
  copy and a queue of unsent edits, so it works offline and syncs when back online. A service
  worker lets the app open with no signal. No logins: anyone with the link can view and edit.
- **Recipes live in `src/data/recipes.ts`**. Adding a recipe means editing that file. The current ones are
  placeholders based on Alice's notes, to be replaced with the real recipes.
- PWA manifest and icons so it can be added to the home screen.
- The week start day is a setting (default: Sunday, matching Alice's notes).

## Later (parked, not in v1)

- Add, edit and import recipes inside the app (paste a URL or a photo)
- Scale servings per meal (e.g. double for guests)
- Lunches and breakfasts, not just dinner
- Favourites, "haven't had in a while" suggestions, and random fill for empty days
- Pantry tracking (what's already in the cupboard)
- Online grocery ordering (Woolworths and Coles)
- Notifications ("defrost the lamb tonight")
- History and stats for meals
