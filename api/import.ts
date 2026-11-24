// GET /api/import?url=...  -> the recipe found on that page (see _lib/importUrl.ts)
import { ImportError, importFromUrl } from './_lib/importUrl.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  try {
    return json({ ok: true, page: await importFromUrl(url) });
  } catch (e) {
    return json({ ok: false, reason: e instanceof ImportError ? e.reason : 'fetch-failed' }, e instanceof ImportError && e.reason === 'bad-url' ? 400 : 200);
  }
}
