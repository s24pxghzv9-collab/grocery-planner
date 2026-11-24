/*
 * The review/edit screen works on a RecipeDraft: plain editable fields. These convert between
 * drafts, imported pages/text, and saved recipes.
 */
import { RECIPES_BY_ID } from '../data/recipes';
import type { Aisle, Category, Recipe } from '../types';
import { formatQty } from './shopping';
import { guessCategory, parseIngredientLine, parseRecipeText, slugify, type RecipeDraft as ParsedText } from './recipeReader';

export interface DraftIngredient {
  key: string;
  amount: string; // "250 g", "1½ tbsp", "2"
  name: string;
  aisle: Aisle;
  staple: boolean;
  /** The original line, shown faintly so it's easy to check the reading. */
  raw?: string;
  /** Not a name the household has used before: worth a glance at the aisle. */
  isNew?: boolean;
}

export interface EditorDraft {
  /** Set when editing an existing recipe. */
  id?: string;
  name: string;
  category: Category;
  minutes: string;
  serves: string;
  ingredients: DraftIngredient[];
  method: string; // one step per line
  notes: string;
  image?: string;
  source?: { name: string; url?: string };
  author?: string;
  tags: string[];
}

let n = 0;
const key = () => `i${Date.now().toString(36)}${n++}`;

export function emptyIngredient(): DraftIngredient {
  return { key: key(), amount: '', name: '', aisle: 'Other', staple: false };
}

export function draftFromRecipe(r: Recipe): EditorDraft {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    minutes: r.minutes ? String(r.minutes) : '',
    serves: r.serves ? String(r.serves) : '',
    ingredients: r.ingredients.map((i) => ({ key: key(), amount: formatQty(i), name: i.name, aisle: i.aisle, staple: !!i.staple })),
    method: (r.method ?? []).join('\n'),
    notes: r.notes ?? '',
    image: r.image,
    source: r.source,
    author: r.author,
    tags: r.tags,
  };
}

/** From recipe text (pasted, a caption, or read from screenshots). */
export function draftFromText(text: string, extra: Partial<EditorDraft> = {}): EditorDraft {
  return draftFromParsed(parseRecipeText(text), extra);
}

export function draftFromParsed(p: ParsedText, extra: Partial<EditorDraft> = {}): EditorDraft {
  const name = extra.name || p.name || '';
  return {
    name,
    category: guessCategory(p.ingredients, name),
    minutes: p.minutes ? String(p.minutes) : '',
    serves: p.serves ? String(p.serves) : '',
    ingredients: p.ingredients.map((i) => ({
      key: key(),
      amount: formatQty(i),
      name: i.name,
      aisle: i.aisle,
      staple: i.staple,
      raw: i.raw,
      isNew: !i.known,
    })),
    method: p.method.join('\n'),
    notes: p.notes ?? '',
    tags: [],
    ...extra,
    ...(extra.name ? {} : { name }),
  };
}

/** From a page read by /api/import: structured recipe lines, or a caption to read like text. */
export function draftFromPage(page: {
  name?: string;
  image?: string;
  ingredientLines: string[];
  steps: string[];
  minutes?: number;
  serves?: number;
  author?: string;
  siteName: string;
  url: string;
  caption?: string;
}): EditorDraft {
  const extra: Partial<EditorDraft> = {
    image: page.image?.startsWith('https://') ? page.image : undefined,
    source: { name: page.siteName, url: page.url },
    author: page.author,
  };
  if (page.ingredientLines.length) {
    const ingredients = page.ingredientLines.flatMap(parseIngredientLine);
    return draftFromParsed(
      { name: page.name ?? '', ingredients, method: page.steps, minutes: page.minutes, serves: page.serves },
      { ...extra, name: page.name ?? '' },
    );
  }
  const draft = draftFromText(page.caption ?? '', extra);
  // Captions often open with a hook rather than the dish name; prefer the page title if short.
  if (page.name && page.name.length <= 70 && !/instagram|tiktok/i.test(page.name)) draft.name = draft.name || page.name;
  return draft;
}

export function recipeFromDraft(d: EditorDraft, parseAmount: (s: string) => { qty?: number; unit?: string }): Recipe {
  const id = d.id ?? slugify(d.name, (candidate) => !!RECIPES_BY_ID[candidate]);
  const minutes = Number(d.minutes);
  const serves = Number(d.serves);
  return {
    id,
    name: d.name.trim(),
    category: d.category,
    tags: d.tags,
    ...(minutes > 0 ? { minutes: Math.round(minutes) } : {}),
    ...(serves > 0 ? { serves: Math.round(serves) } : {}),
    ingredients: d.ingredients
      .filter((i) => i.name.trim())
      .map((i) => {
        const { qty, unit } = parseAmount(i.amount);
        return {
          name: i.name.trim().toLowerCase(),
          ...(qty != null ? { qty } : {}),
          ...(unit ? { unit } : {}),
          aisle: i.aisle,
          ...(i.staple ? { staple: true } : {}),
        };
      }),
    method: d.method
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
    ...(d.image ? { image: d.image } : {}),
    ...(d.source?.name ? { source: d.source } : {}),
    ...(d.author ? { author: d.author } : {}),
    addedAt: Date.now(),
  };
}
