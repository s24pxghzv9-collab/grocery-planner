/*
 * Turns recipe text (a website's ingredient lines, an Instagram caption, or text read from
 * screenshots) into the planner's format: amount, unit and a canonical ingredient name, with
 * its aisle and whether it's a cupboard staple.
 *
 * Runs entirely on the phone; no AI. It uses the household's ingredient dictionary (built from
 * the imported recipes) so new recipes use the same names as old ones and the shopping list
 * adds them up. Anything it isn't sure about is fixed on the review screen.
 */
import dictionary from '../data/ingredient-dictionary.json';
import type { Aisle, Category } from '../types';

export interface ParsedIngredient {
  name: string;
  qty?: number;
  unit?: string;
  aisle: Aisle;
  staple: boolean;
  /** The line as written, for the review screen. */
  raw: string;
  /** Matched an ingredient the household already uses. */
  known: boolean;
}

export interface RecipeDraft {
  name: string;
  ingredients: ParsedIngredient[];
  method: string[];
  serves?: number;
  minutes?: number;
  notes?: string;
}

const DICT = dictionary as unknown as Record<string, [Aisle, number]>;
const DICT_NAMES = Object.keys(DICT).sort((a, b) => b.length - a.length); // longest first

// ---------- Quantities ----------

const FRACTION_CHARS: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const FRAC = Object.keys(FRACTION_CHARS).join('');
const NUM = `(?:\\d+\\s*[${FRAC}]|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[${FRAC}])`;
const QTY_RE = new RegExp(`^(${NUM})(?:\\s*(?:-|–|to)\\s*(${NUM}))?`);

function toNumber(s: string): number {
  s = s.trim().replace(',', '.');
  const mixedChar = s.match(new RegExp(`^(\\d+)\\s*([${FRAC}])$`));
  if (mixedChar) return Number(mixedChar[1]) + FRACTION_CHARS[mixedChar[2]];
  if (FRACTION_CHARS[s] !== undefined) return FRACTION_CHARS[s];
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(s);
}

// ---------- Units ----------

/** Words that can follow a quantity, mapped to the planner's unit (or a conversion). */
const UNITS: [RegExp, string][] = [
  [/^(teaspoons?|tsps?|tsp\.)\b/i, 'tsp'],
  [/^(tablespoons?|tbsps?|tbs|tbls|tbsp\.)\b/i, 'tbsp'],
  [/^T\b/, 'tbsp'],
  [/^cups?\b/i, 'cup'],
  [/^(kilograms?|kilos?|kg)\b/i, 'kg'],
  [/^(grams?|gr|g)\b/i, 'g'],
  [/^(millilit(?:re|er)s?|ml)\b/i, 'ml'],
  [/^(lit(?:re|er)s?|l)\b/i, 'L'],
  [/^(ounces?|oz)\b/i, 'oz'],
  [/^(pounds?|lbs?)\b/i, 'lb'],
  [/^cloves?\b/i, 'clove'],
  [/^bunch(es)?\b/i, 'bunch'],
  [/^(tins?|cans?)\b/i, 'tin'],
  [/^jars?\b/i, 'jar'],
  [/^tubs?\b/i, 'tub'],
  [/^(packs?|packets?|packages?|pkts?)\b/i, 'pack'],
  [/^bags?\b/i, 'bag'],
  [/^sheets?\b/i, 'sheet'],
  [/^slices?\b/i, 'slice'],
  [/^sprigs?\b/i, 'sprig'],
  [/^(stalks?|sticks?)\b/i, 'stalk'],
  [/^heads?\b/i, 'head'],
  [/^pinch(es)?\b/i, 'pinch'],
  [/^knobs?\b/i, 'knob'],
  [/^(handfuls?|pieces?|small|medium|large|whole|x)\b/i, ''],
];

// ---------- Names ----------

/** Common ways of writing an ingredient -> the household's name for it. */
const SYNONYMS: Record<string, string> = {
  onion: 'brown onion', onions: 'brown onion', 'yellow onion': 'brown onion', 'white onion': 'brown onion',
  'green onion': 'spring onion', 'green onions': 'spring onion', scallion: 'spring onion', scallions: 'spring onion',
  'spring onions': 'spring onion', shallot: 'shallots', eschalot: 'shallots', eschalots: 'shallots',
  cilantro: 'coriander', 'coriander leaves': 'coriander', 'fresh coriander': 'coriander',
  'ground beef': 'beef mince', 'minced beef': 'beef mince', 'ground chicken': 'chicken mince',
  'ground pork': 'pork mince', 'minced pork': 'pork mince', 'ground turkey': 'turkey mince',
  'chicken thigh': 'chicken thigh fillets', 'chicken thighs': 'chicken thigh fillets',
  'chicken breast': 'chicken breast fillets', 'chicken breasts': 'chicken breast fillets',
  'heavy cream': 'thickened cream', 'double cream': 'thickened cream', cream: 'thickened cream',
  'single cream': 'pouring cream', 'red pepper': 'red capsicum', 'red bell pepper': 'red capsicum',
  'bell pepper': 'red capsicum', capsicum: 'red capsicum', courgette: 'zucchini', courgettes: 'zucchini',
  zucchinis: 'zucchini', cornstarch: 'cornflour', 'corn starch': 'cornflour', 'all-purpose flour': 'plain flour',
  flour: 'plain flour', 'extra virgin olive oil': 'olive oil', 'extra-virgin olive oil': 'olive oil',
  'canola oil': 'vegetable oil', 'neutral oil': 'vegetable oil', 'peanut oil': 'vegetable oil',
  'avocado oil': 'vegetable oil', oil: 'vegetable oil', 'cooking oil': 'vegetable oil',
  'kosher salt': 'salt', 'sea salt': 'salt', 'sea salt flakes': 'salt', 'salt flakes': 'salt',
  pepper: 'black pepper', 'ground black pepper': 'black pepper', 'parmigiano-reggiano': 'parmesan',
  'parmesan cheese': 'parmesan', 'parmigiano reggiano': 'parmesan', 'grana padano': 'parmesan',
  'pecorino romano': 'pecorino', 'light soy sauce': 'soy sauce', 'low sodium soy sauce': 'soy sauce',
  'reduced sodium soy sauce': 'soy sauce', 'rice wine vinegar': 'rice vinegar', 'jasmine rice': 'rice',
  'white rice': 'rice', 'basmati rice': 'rice', 'chili flakes': 'chilli flakes', 'red pepper flakes': 'chilli flakes',
  'crushed red pepper flakes': 'chilli flakes', 'chili powder': 'chilli powder', 'chili crisp': 'chilli crisp',
  'chili oil': 'chilli oil', 'red chili': 'red chilli', 'red chilli': 'red chilli', chilli: 'red chilli',
  'birds eye chilli': 'red chilli', 'thai chili': 'red chilli', egg: 'eggs', 'egg yolks': 'eggs', 'egg yolk': 'eggs',
  'greek yogurt': 'greek yoghurt', yogurt: 'greek yoghurt', 'chicken broth': 'chicken stock',
  'bone broth': 'chicken stock', 'chicken bone broth': 'chicken stock', 'beef broth': 'beef stock',
  'beef bone broth': 'beef stock', 'vegetable broth': 'vegetable stock', panko: 'panko breadcrumbs',
  'panko crumbs': 'panko breadcrumbs', 'lemon juice': 'lemon', 'lime juice': 'lime', limes: 'lime', lemons: 'lemon',
  'garlic cloves': 'garlic', 'garlic clove': 'garlic', 'minced garlic': 'garlic', 'garlic paste': 'garlic',
  'ginger paste': 'ginger', 'fresh ginger': 'ginger', 'italian seasoning': 'mixed herbs', 'dried mixed herbs': 'mixed herbs',
  'italian herbs': 'mixed herbs', 'tomato puree': 'tomato paste', 'tomato purée': 'tomato paste',
  'chopped tomatoes': 'crushed tomatoes', 'diced tomatoes': 'crushed tomatoes', 'canned tomatoes': 'crushed tomatoes',
  'tomato passata': 'passata', 'ketchup': 'tomato sauce', 'mayo': 'whole-egg mayonnaise', mayonnaise: 'whole-egg mayonnaise',
  'kewpie mayo': 'kewpie mayonnaise', 'caster sugar': 'sugar', 'white sugar': 'sugar', 'granulated sugar': 'sugar',
  'light brown sugar': 'brown sugar', 'palm sugar': 'brown sugar', 'cumin powder': 'ground cumin', cumin: 'ground cumin',
  'sesame seed': 'sesame seeds', 'toasted sesame oil': 'sesame oil', 'dark sesame oil': 'sesame oil',
  'fish sauce': 'fish sauce', 'baby spinach leaves': 'baby spinach', spinach: 'baby spinach', 'cos lettuce': 'cos lettuce',
  'romaine lettuce': 'cos lettuce', 'iceberg': 'iceberg lettuce', 'napa cabbage': 'wombok', 'chinese cabbage': 'wombok',
  'purple cabbage': 'red cabbage', 'cucumbers': 'cucumber', 'lebanese cucumber': 'cucumber', 'persian cucumbers': 'cucumber',
  'carrots': 'carrot', 'potato': 'potatoes', 'parsley': 'flat-leaf parsley', 'italian parsley': 'flat-leaf parsley',
  'mozzarella cheese': 'mozzarella', 'cheddar': 'grated cheddar', 'cheddar cheese': 'grated cheddar',
  'shrimp': 'raw prawns, peeled', prawns: 'raw prawns, peeled', 'raw prawns': 'raw prawns, peeled',
  'snow pea': 'snow peas', 'mushroom': 'mushrooms', 'sausages': 'italian sausages', 'italian sausage': 'italian sausages',
  pancetta: 'guanciale or pancetta', guanciale: 'guanciale or pancetta', 'lemongrass stalk': 'lemongrass',
  'chicken breast mince': 'chicken mince', 'chicken thigh mince': 'chicken mince', 'lean beef mince': 'beef mince',
  chardonnay: 'dry white wine', 'white wine': 'dry white wine', 'ginger powder': 'ground ginger',
  vinegar: 'white vinegar', cashews: 'raw cashews', 'reggiano cheese': 'parmesan', reggiano: 'parmesan',
  rolls: 'bread rolls', 'flour tortillas': 'small flour tortillas', tortillas: 'small flour tortillas',
  'red-pepper flakes': 'chilli flakes', 'teriyaki marinade': 'teriyaki sauce', 'garlic puree': 'garlic',
  'garlic purée': 'garlic', 'green pesto': 'basil pesto', pesto: 'basil pesto', 'creme fraiche': 'crème fraîche',
  'creme fraîche': 'crème fraîche', 'calabrian chilli': 'calabrian chilli paste', 'thighs': 'chicken thigh fillets',
  miso: 'miso paste', 'white miso': 'miso paste', 'red miso': 'miso paste', 'birds eye chillies': 'red chilli',
  'thai chillies': 'red chilli', 'red chillies': 'red chilli', 'red thai chillies': 'red chilli', 'green chilli': 'red chilli',
  'thai green curry paste': 'green curry paste', 'thai red curry paste': 'red curry paste', 'lemongrass paste': 'lemongrass',
  'chicken breast halves': 'chicken breast fillets', 'crispy chilli oil': 'chilli crisp',
  'fried shallots': 'fried shallots', 'asian shallots': 'fried shallots',
};

/** Extra words at the end of a name that don't change what you buy. */
const TAIL_WORDS = /\s+(leaves|sprigs|pieces|chunks|strips|bits|fillets?|wedges?|sheets|links|balls|crumbles|matchsticks|pasta|cheese|slices|halves)$/;

const PREP_WORDS =
  /\b(fresh(ly)?|large|small|medium|chopped|finely|roughly|thinly|thickly|diced|minced|sliced|grated|crushed|peeled|trimmed|halved|quartered|shredded|cubed|julienned|softened|melted|room temperature|at room temperature|to serve|for serving|for garnish|to garnish|to taste|optional|plus extra|plus more|divided|separated|packed|heaped|level|good quality|store-bought|homemade|about|approx\.?|approximately|roughly|lightly beaten|beaten|cooked|uncooked|raw|boneless|skinless|skin-on|unsalted|salted|full-fat|full fat|low-fat|low fat|lean|extra lean|extra-lean|organic|dry-roasted|dry roasted|toasted|crispy|fried|whole)\b/gi;

function singular(w: string): string {
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ches|shes|oes|sses)$/.test(w)) return w.replace(/es$/, '');
  if (/s$/.test(w) && !/ss$/.test(w)) return w.replace(/s$/, '');
  return w;
}

function singularPhrase(n: string): string {
  return n.split(' ').map((w, i, a) => (i === a.length - 1 ? singular(w) : w)).join(' ');
}

function lookup(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (!n) return null;
  if (SYNONYMS[n]) return SYNONYMS[n];
  if (DICT[n]) return n;
  const sing = singularPhrase(n);
  if (SYNONYMS[sing]) return SYNONYMS[sing];
  if (DICT[sing]) return sing;
  if (DICT[n + 's']) return n + 's';
  // A known name at the end, where the main noun goes in English: "light soy sauce" -> "soy sauce",
  // but not "potato gnocchi" -> "potatoes". Trailing words like "leaves" are ignored.
  const tail = n.replace(TAIL_WORDS, '');
  for (const candidate of [tail, singularPhrase(tail)]) {
    for (const known of DICT_NAMES) {
      if (known.length >= 3 && (candidate === known || candidate.endsWith(' ' + known))) return known;
    }
    for (const [syn, target] of Object.entries(SYNONYMS)) {
      if (syn.length >= 4 && (candidate === syn || candidate.endsWith(' ' + syn))) return target;
    }
  }
  return null;
}

const AISLE_HINTS: [RegExp, Aisle][] = [
  [/\b(beef|steak|mince|chicken|pork|lamb|bacon|ham|sausage|prawn|shrimp|fish|salmon|snapper|tuna|barramundi|squid|mussel|chorizo|turkey|duck|fillet)/, 'Meat & Seafood'],
  [/\b(milk|cream|cheese|butter|yoghurt|yogurt|egg|feta|ricotta|mozzarella|halloumi|parmesan)/, 'Dairy & Eggs'],
  [/\b(bread|roll|bun|tortilla|wrap|pita|naan|baguette|sourdough)/, 'Bakery'],
  [/\b(frozen|peas|edamame|pastry)/, 'Frozen'],
  [/\b(sauce|paste|seasoning|spice|powder|dried|ground|flakes|vinegar|mustard|stock cube)/, 'Spices & Sauces'],
  [/\b(pasta|noodle|rice|flour|sugar|tin|can|beans|lentils|chickpeas|oil|stock|broth|nuts?|oats|crumbs|spaghetti|penne|rigatoni|orzo|couscous|quinoa)/, 'Pantry'],
  [/\b(lettuce|tomato|onion|garlic|ginger|carrot|potato|pumpkin|zucchini|cucumber|capsicum|pepper|chilli|herb|basil|mint|parsley|coriander|dill|thyme|rosemary|lemon|lime|apple|banana|avocado|mushroom|spinach|kale|cabbage|broccoli|cauliflower|celery|leek|corn|beans|bok choy|eggplant|sweet potato)/, 'Produce'],
];

function guessAisle(name: string): Aisle {
  const n = name.toLowerCase();
  for (const [re, aisle] of AISLE_HINTS) if (re.test(n)) return aisle;
  return 'Other';
}

const SEPARATORS = /,| - | – |;|\+|\/|\bor\b/i;

function tidy(s: string): string {
  return s
    .replace(/\*/g, ' ')
    .replace(/\b(for (frying|serving|topping|garnish|the pan|drizzling|dusting)|to (serve|garnish|taste))\b.*$/i, ' ')
    .replace(/\bchil(?:e|i|li)(e?s)?\b/gi, (_m, pl) => (pl ? 'chillies' : 'chilli'))
    .replace(/^[\s.,:;~-]+/, '')
    .replace(/^\s*(of|a|an|the|dash of|drop of|splash of|pinch of)\s+/i, ' ')
    .replace(/[-–\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Candidate names for a line, best first: as written (minus notes), then without prep words. */
function nameCandidates(text: string): string[] {
  const base = text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/@\w+/g, ' ');
  const asWritten = tidy(base.split(SEPARATORS)[0]);
  const noPrep = tidy(base.replace(PREP_WORDS, ' ').split(SEPARATORS).find((seg) => seg.replace(/[\s,]/g, '')) ?? '');
  return [...new Set([asWritten, noPrep].filter(Boolean))];
}

function cleanName(text: string): string {
  const c = nameCandidates(text);
  return c[c.length - 1] ?? '';
}

// ---------- One ingredient line ----------

function stripDecoration(line: string): string {
  return line
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ') // emoji
    .replace(/^\s*([-–•*·▢◦✓✔︎☐□○●>]|\d+[.)]\s)\s*/, '') // bullets, "1. "
    .replace(/\$\s?\d+(\.\d+)?/g, ' ') // prices
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseIngredientLine(line: string): ParsedIngredient[] {
  const raw = line.trim();
  let rest = stripDecoration(raw);
  if (!rest) return [];

  // "Juice of 1 lemon", "Zest and juice of 2 limes"
  rest = rest.replace(/^(?:finely grated )?(?:zest|juice)(?: and (?:zest|juice))? of\s+/i, '');
  // "2 x Butter Beans"; "160g / 5.6oz x 2 snapper fillets"
  rest = rest.replace(/^(\d+)\s*x\s+/i, '$1 ');

  let qty: number | undefined;
  let unit: string | undefined;
  const q = rest.match(QTY_RE);
  if (q) {
    qty = Math.max(toNumber(q[1]), q[2] ? toNumber(q[2]) : 0);
    rest = rest.slice(q[0].length).trim();
    // "250g / 8 oz" or "1 (15oz) can": skip a parenthetical or slash-alternative
    rest = rest.replace(/^\([^)]*\)\s*/, '');
    // Units written straight after the number ("250g")
    for (let i = 0; i < 2; i++) {
      const u = UNITS.find(([re]) => re.test(rest));
      if (!u) break;
      rest = rest.replace(u[0], '').trim();
      if (u[1] && !unit) unit = u[1];
    }
    rest = rest
      .replace(/^\/\s*[\d.]+\s*[a-z]+\.?\s*/i, '')
      .replace(/^\([^)]*\)\s*/, '')
      .replace(/^x\s*\d+\s*/i, '')
      .replace(/^of\s+/i, '');
    if (unit === 'oz') {
      qty = Math.round((qty * 28.35) / 5) * 5;
      unit = 'g';
    } else if (unit === 'lb') {
      qty = Math.round((qty * 453.6) / 50) * 50;
      unit = 'g';
    }
  }

  const candidates = nameCandidates(rest);
  const cleaned = candidates[candidates.length - 1];
  if (!cleaned || /^(water|ice|boiling water|cold water|hot water)$/.test(cleaned)) return [];

  // "Salt & pepper", "salt and pepper"
  if (/^salt\s*(&|and)\s*(black\s*)?pepper$/.test(cleaned)) {
    return ['salt', 'black pepper'].map((n) => ({ ...fromDict(n), raw, known: true }));
  }

  let known: string | null = null;
  for (const c of candidates) if ((known = lookup(c))) break;
  const name = known ?? cleaned;
  if (name === 'garlic' && qty && !unit) unit = 'clove';
  if (/\bcloves? garlic|garlic cloves?\b/.test(rest.toLowerCase()) && !unit) unit = 'clove';
  const info = known ? fromDict(known) : { name, aisle: guessAisle(name), staple: false };
  return [{ ...info, ...(qty ? { qty: Math.round(qty * 100) / 100 } : {}), ...(unit ? { unit } : {}), raw, known: !!known }];
}

function fromDict(name: string): { name: string; aisle: Aisle; staple: boolean } {
  const d = DICT[name];
  return { name, aisle: d ? d[0] : guessAisle(name), staple: d ? d[1] === 1 : false };
}

// ---------- Category ----------

const PROTEINS: [RegExp, Category][] = [
  [/\b(prawns?|shrimp|fish|salmon|snapper|tuna|barramundi|cod|squid|calamari|mussels?|scallops?|crab|whiting|flathead|plaice|trout|seafood)\b/, 'Seafood'],
  [/\b(beef|steak|brisket|chuck|ribeye|sirloin|eye fillet|tomahawk|veal)\b/, 'Beef'],
  [/\blamb\b/, 'Lamb'],
  [/\b(pork|bacon|sausages?|pancetta|guanciale|prosciutto|ham|chorizo|salami)\b/, 'Pork'],
  [/\bchicken\b/, 'Chicken'],
  [/\b(turkey|duck)\b/, 'Other'],
];
const NOT_PROTEIN = /\b(stock|broth|bouillon|powder|sauce|paste|seasoning)\b/;

/** The main protein: the first meat or seafood in the list, or Vegetarian if there's none. */
export function guessCategory(ingredients: { name: string }[], title = ''): Category {
  for (const text of [title.toLowerCase(), ...ingredients.map((i) => i.name.toLowerCase())]) {
    if (NOT_PROTEIN.test(text)) continue;
    for (const [re, cat] of PROTEINS) if (re.test(text)) return cat;
  }
  return 'Vegetarian';
}

// ---------- Whole recipe text (captions, screenshots, pasted text) ----------

const ING_HEADER = /^(ingredients?|you('| wi)ll need|what you need|shopping list)\b[:\s]*$/i;
const METHOD_HEADER = /^(method|instructions?|directions?|steps?|how to( make)?( it)?|preparation|to make|recipe)\b[:\s]*$/i;
const SUB_HEADER = /^(for the |to serve|serving|garnish|sauce|marinade|dressing|topping|salad|broth|rice)\b.*:?$|:$/i;
const STEP_PREFIX = /^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i;

function looksLikeIngredient(line: string): boolean {
  const t = stripDecoration(line);
  if (t.length > 90) return false;
  if (QTY_RE.test(t) && !/^\d+[.)]\s/.test(line.trim())) return true;
  return t.split(' ').length <= 5 && !!lookup(cleanName(t));
}

function junk(line: string): boolean {
  return (
    /^#|^@\w+$/.test(line) ||
    /\b(comment|link in bio|follow (me|for)|save (this|for later)|tag a friend|like and|dm me)\b/i.test(line) ||
    /^(\d+\s*(likes?|comments?|views?)|more|see translation|liked by)\b/i.test(line)
  );
}

export function parseRecipeText(text: string): RecipeDraft {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !junk(l));

  let name = '';
  const ingredientLines: string[] = [];
  const method: string[] = [];
  let mode: 'unknown' | 'ingredients' | 'method' = 'unknown';

  for (const line of lines) {
    const plain = stripDecoration(line);
    if (ING_HEADER.test(plain)) {
      mode = 'ingredients';
      continue;
    }
    if (METHOD_HEADER.test(plain)) {
      mode = 'method';
      continue;
    }
    if (SUB_HEADER.test(plain) && plain.length < 40) continue;

    if (!name && mode === 'unknown' && !looksLikeIngredient(line) && plain.length <= 80 && !STEP_PREFIX.test(line)) {
      name = plain.replace(/[#*_]/g, '').trim();
      continue;
    }

    const isStep = STEP_PREFIX.test(line) || plain.length > 90 || (mode === 'method' && !looksLikeIngredient(line));
    if (mode === 'ingredients' && !STEP_PREFIX.test(line) && plain.length <= 120) ingredientLines.push(line);
    else if (isStep) method.push(line.replace(STEP_PREFIX, '').trim());
    else if (looksLikeIngredient(line)) ingredientLines.push(line);
    else if (mode === 'method') method.push(plain);
  }

  const all = lines.join(' ');
  const serves = all.match(/\b(?:serves|servings?|feeds|makes)\s*:?\s*(\d+)/i) ?? all.match(/\b(\d+)\s*(?:servings|serves|people|portions)\b/i);
  const hours = all.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  const mins = all.match(/\b(\d+)\s*(?:minutes?|mins?)\b/i);
  const minutes = (hours ? Math.round(Number(hours[1]) * 60) : 0) + (mins && !hours ? Number(mins[1]) : 0);

  return {
    name,
    ingredients: ingredientLines.flatMap(parseIngredientLine),
    method,
    ...(serves ? { serves: Number(serves[1]) } : {}),
    ...(minutes ? { minutes } : {}),
  };
}

/** Lowercase, dash-separated id from a name, made unique against existing ids. */
export function slugify(name: string, taken: (id: string) => boolean): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'recipe';
  let id = base;
  for (let n = 2; taken(id); n++) id = `${base}-${n}`;
  return id;
}
