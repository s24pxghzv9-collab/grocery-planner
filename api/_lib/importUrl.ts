/*
 * Reads a recipe from a web page so the app can import it from a pasted link.
 *
 * 1. Recipe websites publish a standard recipe block (schema.org "Recipe" JSON-LD) with the
 *    title, photo, ingredient lines and steps. That's the reliable path.
 * 2. Instagram/TikTok and other pages: fall back to the post caption (Instagram's public embed
 *    page, or the page's preview text), which the app then reads like pasted text.
 *
 * The phone does the ingredient parsing (src/lib/recipeReader.ts); this only fetches and extracts.
 */

export interface ImportedPage {
  name?: string;
  image?: string;
  ingredientLines: string[];
  steps: string[];
  minutes?: number;
  serves?: number;
  author?: string;
  siteName: string;
  url: string;
  /** Free text (a caption) when the page had no structured recipe. */
  caption?: string;
}

// ---------- Text helpers ----------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+\d*);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function text(v: unknown): string {
  if (typeof v !== 'string') return '';
  return decodeEntities(decodeEntities(v).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(p|div|li)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

/** ISO 8601 duration ("PT1H30M") to minutes. */
export function isoMinutes(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const m = v.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total > 0 ? total : undefined;
}

function firstNumber(v: unknown): number | undefined {
  const s = Array.isArray(v) ? v.map(String).join(' ') : String(v ?? '');
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

function imageUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return imageUrl(v[v.length > 1 ? 0 : 0]);
  if (typeof v === 'object') return imageUrl((v as Record<string, unknown>).url ?? (v as Record<string, unknown>)['@id']);
  return undefined;
}

function authorName(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return text(v);
  if (Array.isArray(v)) return authorName(v[0]);
  if (typeof v === 'object') return text((v as Record<string, unknown>).name);
  return undefined;
}

function steps(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === 'string') {
    return text(v)
      .split(/\n+|(?<=\.)\s+(?=\d+\.\s)/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap(steps);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.itemListElement) return steps(o.itemListElement); // HowToSection
    return steps(o.text ?? o.name);
  }
  return [];
}

// ---------- Structured recipe (JSON-LD) ----------

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const type = o['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return o;
  if (o['@graph']) return findRecipe(o['@graph']);
  if (o.mainEntity) return findRecipe(o.mainEntity);
  return null;
}

function meta(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content) : undefined;
}

function siteNameFor(url: URL, html: string): string {
  const host = url.hostname.replace(/^www\./, '');
  if (/instagram\.com$/.test(host)) return 'Instagram';
  if (/tiktok\.com$/.test(host)) return 'TikTok';
  return meta(html, 'og:site_name') ?? host;
}

/** Pulls a recipe out of a page's HTML. Pure, so it's easy to test. */
export function extractRecipe(html: string, pageUrl: string): ImportedPage {
  const url = new URL(pageUrl);
  const siteName = siteNameFor(url, html);
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(raw.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const ingredientLines = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : [])
      .map(text)
      .filter(Boolean);
    return {
      name: text(r.name) || undefined,
      image: imageUrl(r.image),
      ingredientLines,
      steps: steps(r.recipeInstructions),
      minutes: isoMinutes(r.totalTime) ?? (((isoMinutes(r.prepTime) ?? 0) + (isoMinutes(r.cookTime) ?? 0)) || undefined),
      serves: firstNumber(r.recipeYield),
      author: authorName(r.author),
      siteName,
      url: pageUrl,
    };
  }

  // No structured recipe: use the caption / description.
  let caption = meta(html, 'og:description') ?? meta(html, 'description') ?? '';
  // Instagram preview text: '123 likes, 4 comments - user on May 1, 2026: "the caption"'
  const ig = caption.match(/^[^:]*?\bon [A-Z][a-z]+ \d{1,2}, \d{4}: "([\s\S]*)"\.?$/);
  if (ig) caption = ig[1];
  return {
    name: meta(html, 'og:title')?.replace(/ on Instagram.*$| \| TikTok$/i, '') || undefined,
    image: meta(html, 'og:image'),
    ingredientLines: [],
    steps: [],
    siteName,
    url: pageUrl,
    caption: caption || undefined,
  };
}

/** Caption and photo from Instagram's public embed page (no login needed, usually). */
export function extractInstagramEmbed(html: string): { caption?: string; image?: string; author?: string } {
  const captionHtml = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/)?.[1] ?? html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const author = html.match(/class="CaptionUsername"[^>]*>([^<]+)</)?.[1] ?? html.match(/class="UsernameText"[^>]*>([^<]+)</)?.[1];
  let caption = captionHtml ? text(captionHtml.replace(/<a[^>]*class="CaptionUsername"[\s\S]*?<\/a>/, '')) : undefined;
  if (caption) caption = caption.replace(/^\s*\n+/, '').trim();
  const image = decodeEntities(html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^"]+)"/)?.[1] ?? '') || undefined;
  return { caption: caption || undefined, image, author: author?.trim() };
}

// ---------- Fetching ----------

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export function checkUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const h = url.hostname;
  // Don't let the server be pointed at itself or private networks.
  if (/^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.endsWith('.internal') || h.endsWith('.local') || h.includes(':')) return null;
  return url;
}

async function fetchHtml(url: string, fetchImpl: typeof fetch): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetchImpl(url, {
      headers: { 'user-agent': BROWSER_UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-AU,en;q=0.9' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    return body.slice(0, 3_000_000);
  } finally {
    clearTimeout(timer);
  }
}

export async function importFromUrl(input: string, fetchImpl: typeof fetch = fetch): Promise<ImportedPage> {
  const url = checkUrl(input);
  if (!url) throw new ImportError('bad-url');

  const isInstagram = /(^|\.)instagram\.com$/.test(url.hostname);
  if (isInstagram) {
    const code = url.pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/)?.[2];
    if (code) {
      try {
        const embed = extractInstagramEmbed(await fetchHtml(`https://www.instagram.com/p/${code}/embed/captioned/`, fetchImpl));
        if (embed.caption) {
          return { ingredientLines: [], steps: [], siteName: 'Instagram', url: `https://www.instagram.com/reel/${code}/`, ...embed };
        }
      } catch {
        // fall through to the normal page
      }
    }
  }

  let html: string;
  try {
    html = await fetchHtml(url.toString(), fetchImpl);
  } catch {
    throw new ImportError(isInstagram ? 'blocked' : 'fetch-failed');
  }
  const page = extractRecipe(html, url.toString());
  if (!page.ingredientLines.length && !page.caption) throw new ImportError(isInstagram ? 'blocked' : 'no-recipe');
  return page;
}

export class ImportError extends Error {
  constructor(public reason: 'bad-url' | 'fetch-failed' | 'blocked' | 'no-recipe') {
    super(reason);
  }
}
