import { CATEGORY_ORDER, type Recipe } from '../types';

/*
 * THE RECIPE BANK
 * ---------------
 * These are PLACEHOLDER recipes based on meals from Alice's notes. Replace them with
 * the real ones. To add a recipe, copy one block and change it:
 *
 *  - category:    main protein: Beef, Lamb, Pork, Chicken, Seafood, Vegetarian or Other.
 *                 It sets the dish's colour in the app.
 *  - id:          unique, lowercase-with-dashes. Don't change it after it's been planned,
 *                 or the old plan entries won't find the recipe.
 *  - ingredients: use the same name and unit across recipes ("brown onion", "g") so the
 *                 shopping list can add them together.
 *  - staple:      true for things you usually have in the cupboard (oil, salt, spices).
 *  - aisle:       Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry, Spices & Sauces,
 *                 Frozen or Other.
 */
export const RECIPES: Recipe[] = [
  {
    id: 'sage-ravioli',
    category: 'Vegetarian',
    name: 'Sage ravioli',
    tags: ['Pasta', 'Vegetarian', 'Quick'],
    serves: 2,
    minutes: 20,
    ingredients: [
      { name: 'fresh ravioli', qty: 500, unit: 'g', aisle: 'Dairy & Eggs' },
      { name: 'butter', qty: 80, unit: 'g', aisle: 'Dairy & Eggs' },
      { name: 'fresh sage', qty: 1, unit: 'bunch', aisle: 'Produce' },
      { name: 'parmesan', qty: 50, unit: 'g', aisle: 'Dairy & Eggs' },
      { name: 'lemon', qty: 1, aisle: 'Produce' },
      { name: 'salt & pepper', aisle: 'Spices & Sauces', staple: true },
    ],
    method: [
      'Cook the ravioli in salted boiling water.',
      'Melt the butter until foaming and nutty, then add the sage leaves until crisp.',
      'Toss the ravioli through the butter with a squeeze of lemon. Top with parmesan.',
    ],
  },
  {
    id: 'beef-wellington',
    category: 'Beef',
    name: 'Beef Wellington',
    tags: ['Beef', 'Special'],
    serves: 4,
    minutes: 90,
    ingredients: [
      { name: 'beef eye fillet', qty: 800, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'puff pastry sheets', qty: 2, aisle: 'Frozen' },
      { name: 'mushrooms', qty: 400, unit: 'g', aisle: 'Produce' },
      { name: 'prosciutto', qty: 100, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'eggs', qty: 1, aisle: 'Dairy & Eggs' },
      { name: 'dijon mustard', aisle: 'Spices & Sauces', staple: true },
      { name: 'potatoes', qty: 1, unit: 'kg', aisle: 'Produce' },
      { name: 'green beans', qty: 200, unit: 'g', aisle: 'Produce' },
      { name: 'olive oil', aisle: 'Pantry', staple: true },
    ],
    method: [
      'Sear the beef all over, then brush with mustard and let it cool.',
      'Blitz and cook the mushrooms until dry. Lay out the prosciutto, spread with mushroom, and roll the beef inside.',
      'Wrap in pastry, brush with egg, and bake at 200°C for 35–40 min. Rest for 10 min.',
    ],
  },
  {
    id: 'prawn-stirfry',
    category: 'Seafood',
    name: 'Prawn stir-fry',
    tags: ['Seafood', 'Quick', 'Asian'],
    serves: 2,
    minutes: 20,
    ingredients: [
      { name: 'green prawns', qty: 400, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'stir-fry vegetables', qty: 1, unit: 'bag', aisle: 'Produce' },
      { name: 'garlic', qty: 3, unit: 'cloves', aisle: 'Produce' },
      { name: 'ginger', qty: 1, unit: 'knob', aisle: 'Produce' },
      { name: 'hokkien noodles', qty: 400, unit: 'g', aisle: 'Pantry' },
      { name: 'soy sauce', aisle: 'Spices & Sauces', staple: true },
      { name: 'oyster sauce', aisle: 'Spices & Sauces', staple: true },
    ],
  },
  {
    id: 'mexican-beef',
    category: 'Beef',
    name: 'Mexican beef',
    tags: ['Beef', 'Mexican'],
    serves: 4,
    minutes: 30,
    ingredients: [
      { name: 'beef mince', qty: 500, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'brown onion', qty: 1, aisle: 'Produce' },
      { name: 'capsicum', qty: 1, aisle: 'Produce' },
      { name: 'black beans', qty: 1, unit: 'tin', aisle: 'Pantry' },
      { name: 'diced tomatoes', qty: 1, unit: 'tin', aisle: 'Pantry' },
      { name: 'rice', qty: 1, unit: 'cup', aisle: 'Pantry', staple: true },
      { name: 'avocado', qty: 1, aisle: 'Produce' },
      { name: 'sour cream', qty: 1, unit: 'tub', aisle: 'Dairy & Eggs' },
      { name: 'taco seasoning', aisle: 'Spices & Sauces', staple: true },
    ],
  },
  {
    id: 'lamb-kofta',
    category: 'Lamb',
    name: 'Lamb kofta & cous cous salad',
    tags: ['Lamb', 'Middle Eastern'],
    serves: 4,
    minutes: 35,
    ingredients: [
      { name: 'lamb mince', qty: 500, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'cous cous', qty: 1, unit: 'cup', aisle: 'Pantry' },
      { name: 'cucumber', qty: 1, aisle: 'Produce' },
      { name: 'cherry tomatoes', qty: 250, unit: 'g', aisle: 'Produce' },
      { name: 'red onion', qty: 1, aisle: 'Produce' },
      { name: 'fresh mint', qty: 1, unit: 'bunch', aisle: 'Produce' },
      { name: 'feta', qty: 100, unit: 'g', aisle: 'Dairy & Eggs' },
      { name: 'greek yoghurt', qty: 1, unit: 'tub', aisle: 'Dairy & Eggs' },
      { name: 'lemon', qty: 1, aisle: 'Produce' },
      { name: 'cumin', aisle: 'Spices & Sauces', staple: true },
    ],
  },
  {
    id: 'steak-bbq',
    category: 'Beef',
    name: 'Steak BBQ',
    tags: ['Beef', 'BBQ'],
    serves: 2,
    minutes: 25,
    ingredients: [
      { name: 'scotch fillet steaks', qty: 2, aisle: 'Meat & Seafood' },
      { name: 'potatoes', qty: 500, unit: 'g', aisle: 'Produce' },
      { name: 'salad leaves', qty: 1, unit: 'bag', aisle: 'Produce' },
      { name: 'cherry tomatoes', qty: 250, unit: 'g', aisle: 'Produce' },
      { name: 'olive oil', aisle: 'Pantry', staple: true },
      { name: 'salt & pepper', aisle: 'Spices & Sauces', staple: true },
    ],
  },
  {
    id: 'chicken-tacos',
    category: 'Chicken',
    name: 'Chicken tacos',
    tags: ['Chicken', 'Mexican', 'Quick'],
    serves: 4,
    minutes: 25,
    ingredients: [
      { name: 'chicken thighs', qty: 600, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'soft tortillas', qty: 1, unit: 'pack', aisle: 'Bakery' },
      { name: 'iceberg lettuce', qty: 1, aisle: 'Produce' },
      { name: 'avocado', qty: 1, aisle: 'Produce' },
      { name: 'lime', qty: 2, aisle: 'Produce' },
      { name: 'grated cheese', qty: 1, unit: 'bag', aisle: 'Dairy & Eggs' },
      { name: 'sour cream', qty: 1, unit: 'tub', aisle: 'Dairy & Eggs' },
      { name: 'taco seasoning', aisle: 'Spices & Sauces', staple: true },
    ],
  },
  {
    id: 'crispy-chicken-bowls',
    category: 'Chicken',
    name: 'Crispy chicken bowls',
    tags: ['Chicken', 'Asian'],
    serves: 4,
    minutes: 40,
    ingredients: [
      { name: 'chicken breast', qty: 500, unit: 'g', aisle: 'Meat & Seafood' },
      { name: 'panko breadcrumbs', qty: 1, unit: 'cup', aisle: 'Pantry' },
      { name: 'eggs', qty: 2, aisle: 'Dairy & Eggs' },
      { name: 'rice', qty: 1.5, unit: 'cup', aisle: 'Pantry', staple: true },
      { name: 'cucumber', qty: 1, aisle: 'Produce' },
      { name: 'carrot', qty: 2, aisle: 'Produce' },
      { name: 'edamame', qty: 1, unit: 'bag', aisle: 'Frozen' },
      { name: 'kewpie mayo', aisle: 'Spices & Sauces', staple: true },
      { name: 'sriracha', aisle: 'Spices & Sauces', staple: true },
    ],
  },
];

export const RECIPES_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Categories that have at least one recipe, in a fixed order. */
export const USED_CATEGORIES = CATEGORY_ORDER.filter((c) => RECIPES.some((r) => r.category === c));
