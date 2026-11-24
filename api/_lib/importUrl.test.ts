import { describe, expect, it } from 'vitest';
import { checkUrl, extractInstagramEmbed, extractRecipe, importFromUrl, isoMinutes } from './importUrl';

// Shaped like a WP Recipe Maker page (RecipeTin Eats and many food blogs).
const WPRM = `<html><head>
<meta property="og:site_name" content="RecipeTin Eats" />
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"x"},
{"@type":"Recipe","name":"Prawn Stir Fry (Shrimp)","author":{"@type":"Person","name":"Nagi"},
"image":["https://www.recipetineats.com/a.jpg","https://www.recipetineats.com/b.jpg"],
"recipeYield":["4","4 people"],"totalTime":"PT17M",
"recipeIngredient":["1 1/2 tbsp light soy sauce","250g / 8 oz prawns &amp; stuff"],
"recipeInstructions":[{"@type":"HowToSection","name":"Sauce","itemListElement":[{"@type":"HowToStep","text":"Mix the sauce."}]},
{"@type":"HowToStep","text":"Cook the &lt;b&gt;prawns&lt;/b&gt;."}]}]}</script></head></html>`;

describe('extractRecipe', () => {
  it('reads schema.org recipes, including @graph and HowToSections', () => {
    const p = extractRecipe(WPRM, 'https://www.recipetineats.com/prawn-stir-fry/');
    expect(p).toMatchObject({
      name: 'Prawn Stir Fry (Shrimp)',
      author: 'Nagi',
      image: 'https://www.recipetineats.com/a.jpg',
      serves: 4,
      minutes: 17,
      siteName: 'RecipeTin Eats',
      ingredientLines: ['1 1/2 tbsp light soy sauce', '250g / 8 oz prawns & stuff'],
    });
    expect(p.steps).toEqual(['Mix the sauce.', 'Cook the prawns.']);
  });

  it('falls back to the Instagram preview caption', () => {
    const html = `<meta property="og:title" content="Kelsey on Instagram: &quot;Beef bowls&quot;" />
<meta property="og:description" content="1,234 likes, 56 comments - kelsey on March 3, 2026: &quot;Beef bowls\nINGREDIENTS\n500g beef mince&quot;." />
<meta property="og:image" content="https://scontent.cdninstagram.com/x.jpg" />`;
    const p = extractRecipe(html, 'https://www.instagram.com/reel/ABC/');
    expect(p.siteName).toBe('Instagram');
    expect(p.caption).toBe('Beef bowls\nINGREDIENTS\n500g beef mince');
    expect(p.image).toBe('https://scontent.cdninstagram.com/x.jpg');
  });
});

describe('extractInstagramEmbed', () => {
  it('reads the caption and photo from the embed page', () => {
    const html = `<img class="EmbeddedMediaImage" alt="x" src="https://scontent.cdninstagram.com/p.jpg?a=1&amp;b=2" />
<div class="Caption"><a class="CaptionUsername" href="#">cupofliv</a><br /><br />One-pan pasta<br />INGREDIENTS<br />- 10 oz farfalle<div class="CaptionComments">`;
    expect(extractInstagramEmbed(html)).toEqual({
      caption: 'One-pan pasta\nINGREDIENTS\n- 10 oz farfalle',
      image: 'https://scontent.cdninstagram.com/p.jpg?a=1&b=2',
      author: 'cupofliv',
    });
  });
});

describe('importFromUrl', () => {
  it('refuses non-web and private addresses', async () => {
    expect(checkUrl('javascript:alert(1)')).toBeNull();
    expect(checkUrl('http://127.0.0.1/x')).toBeNull();
    expect(checkUrl('http://localhost:3000')).toBeNull();
    expect(checkUrl('https://www.recipetineats.com/x')).not.toBeNull();
    await expect(importFromUrl('ftp://x')).rejects.toThrow('bad-url');
  });

  it('uses the embed page for Instagram links', async () => {
    const calls: string[] = [];
    const fake = (async (u: string) => {
      calls.push(String(u));
      return new Response('<div class="Caption"><a class="CaptionUsername">me</a><br />Pasta<br />- 1 cup orzo<div class="CaptionComments">');
    }) as unknown as typeof fetch;
    const p = await importFromUrl('https://www.instagram.com/reel/DTWTF-Aj-um/?igsh=abc', fake);
    expect(calls[0]).toBe('https://www.instagram.com/p/DTWTF-Aj-um/embed/captioned/');
    expect(p.caption).toBe('Pasta\n- 1 cup orzo');
  });

  it('says why when there is nothing to import', async () => {
    const fake = (async () => new Response('<html><title>Login</title></html>')) as unknown as typeof fetch;
    await expect(importFromUrl('https://www.instagram.com/reel/X/', fake)).rejects.toThrow('blocked');
    await expect(importFromUrl('https://example.com/blog', fake)).rejects.toThrow('no-recipe');
  });

  it('parses ISO durations', () => {
    expect(isoMinutes('PT1H30M')).toBe(90);
    expect(isoMinutes('PT45M')).toBe(45);
    expect(isoMinutes('P0DT2H')).toBe(120);
  });
});
